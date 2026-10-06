import { clipboard } from 'electron'
import { IPC, type ErrorCode, type SessionEvent } from '../shared/ipc'
import { describeError, improveText } from './openai'
import { readSelectionOrClipboard } from './selection'
import { getActiveProviders } from './settings'
import { sendToRenderer, showWindow } from './window'

const MAX_SOURCE_LENGTH = 12_000

let lastId = 0
let current: { source: string; controller: AbortController } | null = null

function emit(event: SessionEvent): void {
  void sendToRenderer(IPC.sessionEvent, event)
}

type SessionOptions = {
  /** Read the result aloud as soon as it is ready. */
  speak?: boolean
}

// Runs on every press of a global shortcut.
export async function startSession({ speak = false }: SessionOptions = {}): Promise<void> {
  await run(await readSelectionOrClipboard(), speak)
}

// From the tray menu there is no focused selection to read.
export function startSessionFromClipboard({ speak = false }: SessionOptions = {}): Promise<void> {
  return run(clipboard.readText().trim(), speak)
}

export async function retrySession(): Promise<void> {
  if (current) await run(current.source, false)
}

async function run(source: string, speak: boolean): Promise<void> {
  current?.controller.abort()
  const controller = new AbortController()
  current = { source, controller }
  const id = ++lastId

  showWindow()
  emit({ type: 'start', id, source, speak })
  if (!source) return

  if (source.length > MAX_SOURCE_LENGTH) {
    emit({
      type: 'error',
      id,
      code: 'too-long',
      message: `O texto copiado tem ${source.length.toLocaleString('pt-BR')} caracteres. O limite é ${MAX_SOURCE_LENGTH.toLocaleString('pt-BR')}.`
    })
    return
  }

  const providers = getActiveProviders()
  if (providers.length === 0) {
    emit({ type: 'error', id, code: 'missing-key', message: 'Configure um provedor de IA para começar.' })
    return
  }

  // Each provider is tried in order; any failure hands over to the next one.
  let failure: { code: ErrorCode; message: string } | null = null
  for (const [index, provider] of providers.entries()) {
    const isLast = index === providers.length - 1
    emit({ type: 'provider', id, name: provider.name, model: provider.model, fallback: index > 0 })
    try {
      const text = await improveText({
        provider,
        text: source,
        signal: controller.signal,
        maxRetries: isLast ? 2 : 0,
        onMode: (mode) => emit({ type: 'mode', id, mode }),
        onDelta: (delta) => emit({ type: 'delta', id, delta })
      })
      if (text) {
        emit({ type: 'done', id, text })
        return
      }
      failure = { code: 'unknown', message: `${provider.name} não retornou nenhum texto.` }
    } catch (error) {
      // Aborted because a newer session replaced this one.
      if (controller.signal.aborted) return
      failure = describeError(error, provider)
    }
  }

  if (failure) {
    const prefix = providers.length > 1 ? 'Nenhum provedor respondeu. Último erro: ' : ''
    emit({ type: 'error', id, code: failure.code, message: prefix + failure.message })
  }
}
