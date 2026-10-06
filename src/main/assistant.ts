import { clipboard } from 'electron'
import { IPC, type SessionEvent } from '../shared/ipc'
import { describeError, improveText } from './openai'
import { getApiKey, getModel } from './settings'
import { sendToRenderer, showWindow } from './window'

const MAX_SOURCE_LENGTH = 12_000

let lastId = 0
let current: { source: string; controller: AbortController } | null = null

function emit(event: SessionEvent): void {
  void sendToRenderer(IPC.sessionEvent, event)
}

// Runs on every press of the global shortcut.
export function startSession(): Promise<void> {
  return run(clipboard.readText().trim())
}

export async function retrySession(): Promise<void> {
  if (current) await run(current.source)
}

async function run(source: string): Promise<void> {
  current?.controller.abort()
  const controller = new AbortController()
  current = { source, controller }
  const id = ++lastId

  showWindow()
  emit({ type: 'start', id, source })
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

  const apiKey = getApiKey()
  if (!apiKey) {
    emit({ type: 'error', id, code: 'missing-key', message: 'Configure sua chave de API da OpenAI para começar.' })
    return
  }

  const model = getModel()
  try {
    const text = await improveText({
      apiKey,
      model,
      text: source,
      signal: controller.signal,
      onMode: (mode) => emit({ type: 'mode', id, mode }),
      onDelta: (delta) => emit({ type: 'delta', id, delta })
    })
    if (text) emit({ type: 'done', id, text })
    else emit({ type: 'error', id, code: 'unknown', message: 'O modelo não retornou nenhum texto. Tente de novo.' })
  } catch (error) {
    // Aborted because a newer session replaced this one.
    if (controller.signal.aborted) return
    emit({ type: 'error', id, ...describeError(error, model) })
  }
}
