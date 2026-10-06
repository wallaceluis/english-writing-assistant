import { clipboard } from 'electron'
import { IPC, MAX_SOURCE_LENGTH, type Direction, type ErrorCode, type RunRequest, type SessionEvent } from '../shared/ipc'
import { describeError, improveText } from './openai'
import { readSelectionOrClipboard } from './selection'
import { getActiveProviders, getPreferences } from './settings'
import { sendToRenderer, showWindow } from './window'

let lastId = 0
let current: { controller: AbortController } | null = null

function emit(event: SessionEvent): void {
  void sendToRenderer(IPC.sessionEvent, event)
}

type Trigger = {
  direction: Direction
  /** Read the result aloud as soon as it is ready. */
  speak?: boolean
}

// Runs on every press of a global shortcut.
export async function startSession({ direction, speak = false }: Trigger): Promise<void> {
  await run({ source: await readSelectionOrClipboard(), direction, tone: getPreferences().tone }, speak)
}

// From the tray menu there is no focused selection to read.
export function startSessionFromClipboard({ direction, speak = false }: Trigger): Promise<void> {
  return run({ source: clipboard.readText().trim(), direction, tone: getPreferences().tone }, speak)
}

// Asked for by the window: retry, another tone, another direction.
export function runRequest(request: RunRequest): Promise<void> {
  return run(request, false)
}

async function run(request: RunRequest, speak: boolean): Promise<void> {
  current?.controller.abort()
  const controller = new AbortController()
  current = { controller }
  const id = ++lastId
  const { source } = request

  showWindow()
  emit({ type: 'start', id, speak, ...request })
  if (!source) return

  if (source.length > MAX_SOURCE_LENGTH) {
    emit({
      type: 'error',
      id,
      code: 'too-long',
      message: `O texto tem ${source.length.toLocaleString('pt-BR')} caracteres. O limite é ${MAX_SOURCE_LENGTH.toLocaleString('pt-BR')}.`
    })
    return
  }

  const providers = getActiveProviders()
  if (providers.length === 0) {
    emit({ type: 'error', id, code: 'missing-key', message: 'Configure um provedor de IA para começar.' })
    return
  }

  // Each provider is tried in order; any failure hands over to the next one.
  const { glossary } = getPreferences()
  let failure: { code: ErrorCode; message: string } | null = null
  for (const [index, provider] of providers.entries()) {
    const isLast = index === providers.length - 1
    emit({ type: 'provider', id, name: provider.name, model: provider.model, fallback: index > 0 })
    try {
      const text = await improveText({
        provider,
        request,
        glossary,
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
