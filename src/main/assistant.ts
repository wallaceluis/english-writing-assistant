import { clipboard } from 'electron'
import {
  IPC,
  MAX_SOURCE_LENGTH,
  type Direction,
  type ErrorCode,
  type ExplainResult,
  type Mode,
  type RunRequest,
  type SessionEvent
} from '../shared/ipc'
import { addHistory } from './history'
import { completeText, describeError, improveText } from './openai'
import { EXPLAIN_PROMPT, wrapCorrection } from './prompt'
import { pasteText, readSelection, readSelectionOrClipboard } from './selection'
import { getActiveProviders, getPreferences, type ResolvedProvider } from './settings'
import { notify } from './tray'
import { hideWindow, sendToRenderer, setTaskbarBusy, showWindow } from './window'

// Time for the previous application to get the focus back once our window is gone.
const FOCUS_RETURN_MS = 250

type Failure = { code: ErrorCode; message: string }

let lastId = 0
let current: { controller: AbortController } | null = null

function emit(event: SessionEvent): void {
  void sendToRenderer(IPC.sessionEvent, event)
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs `attempt` on each active provider in order; any failure hands over to the next one.
 * Only the last provider retries on its own, so the others give way immediately.
 */
async function withProviders<T>(
  signal: AbortSignal,
  attempt: (provider: ResolvedProvider, maxRetries: number, index: number) => Promise<T | null>
): Promise<{ ok: true; value: T; provider: ResolvedProvider } | ({ ok: false } & Failure) | null> {
  const providers = getActiveProviders()
  if (providers.length === 0) {
    return { ok: false, code: 'missing-key', message: 'Configure um provedor de IA para começar.' }
  }

  let failure: Failure = { code: 'unknown', message: 'Erro inesperado.' }
  for (const [index, provider] of providers.entries()) {
    try {
      const value = await attempt(provider, index === providers.length - 1 ? 2 : 0, index)
      if (value !== null) return { ok: true, value, provider }
      failure = { code: 'unknown', message: `${provider.name} não retornou nenhum texto.` }
    } catch (error) {
      // Aborted because something newer replaced this request: nobody is waiting for the answer.
      if (signal.aborted) return null
      failure = describeError(error, provider)
    }
  }

  const prefix = providers.length > 1 ? 'Nenhum provedor respondeu. Último erro: ' : ''
  return { ok: false, code: failure.code, message: prefix + failure.message }
}

function tooLong(source: string): Failure | null {
  if (source.length <= MAX_SOURCE_LENGTH) return null
  return {
    code: 'too-long',
    message: `O texto tem ${source.length.toLocaleString('pt-BR')} caracteres. O limite é ${MAX_SOURCE_LENGTH.toLocaleString('pt-BR')}.`
  }
}

function remember(request: RunRequest, result: string, mode: Mode | null, provider: ResolvedProvider): void {
  if (getPreferences().history) addHistory({ ...request, result, mode, provider: provider.name })
}

type Trigger = {
  direction: Direction
  /** Read the result aloud as soon as it is ready. */
  speak?: boolean
}

// Runs on every press of a global shortcut that opens the window.
export async function startSession({ direction, speak = false }: Trigger): Promise<void> {
  await run({ source: await readSelectionOrClipboard(), direction, tone: getPreferences().tone }, speak)
}

// From the tray menu there is no focused selection to read.
export function startSessionFromClipboard({ direction, speak = false }: Trigger): Promise<void> {
  return run({ source: clipboard.readText().trim(), direction, tone: getPreferences().tone }, speak)
}

// Asked for by the window: retry, another tone, an entry of the history.
export function runRequest(request: RunRequest): Promise<void> {
  return run(request, false)
}

async function run(request: RunRequest, speak: boolean): Promise<void> {
  current?.controller.abort()
  const controller = new AbortController()
  current = { controller }
  const id = ++lastId

  showWindow()
  emit({ type: 'start', id, speak, ...request })
  if (!request.source) return

  const oversized = tooLong(request.source)
  if (oversized) return emit({ type: 'error', id, ...oversized })

  const { glossary } = getPreferences()
  let mode: Mode | null = null
  const outcome = await withProviders(controller.signal, (provider, maxRetries, index) => {
    mode = null
    emit({ type: 'provider', id, name: provider.name, model: provider.model, fallback: index > 0 })
    return improveText({
      provider,
      request,
      glossary,
      signal: controller.signal,
      maxRetries,
      onMode: (detected) => {
        mode = detected
        emit({ type: 'mode', id, mode: detected })
      },
      onDelta: (delta) => emit({ type: 'delta', id, delta })
    })
  })

  if (!outcome) return
  if (!outcome.ok) return emit({ type: 'error', id, code: outcome.code, message: outcome.message })
  emit({ type: 'done', id, text: outcome.value })
  remember(request, outcome.value, mode, outcome.provider)
}

/**
 * The shortcut that never opens the window: the selection is rewritten in English and typed back over itself.
 * The taskbar button pulses meanwhile, and problems are reported through the tray.
 */
export async function replaceSelection(): Promise<void> {
  const source = await readSelection()
  if (!source) return notify('Nada selecionado', 'Selecione um texto antes de usar o atalho de substituir.')

  const request: RunRequest = { source, direction: 'to-english', tone: getPreferences().tone }
  const oversized = tooLong(source)
  if (oversized) return notify('Texto longo demais', oversized.message)

  const controller = new AbortController()
  const { glossary } = getPreferences()
  let mode: Mode | null = null

  setTaskbarBusy(true)
  const outcome = await withProviders(controller.signal, (provider, maxRetries) => {
    mode = null
    return improveText({
      provider,
      request,
      glossary,
      signal: controller.signal,
      maxRetries,
      onMode: (detected) => (mode = detected),
      onDelta: () => {}
    })
  })
  setTaskbarBusy(false)

  if (!outcome) return
  if (!outcome.ok) return notify('Não foi possível substituir', outcome.message)

  remember(request, outcome.value, mode, outcome.provider)
  if (!(await pasteText(outcome.value))) {
    notify('Não foi possível colar', 'O texto em inglês está no clipboard: pressione Ctrl+V.')
  }
}

/** The "Substituir" button: closes the window and types the result into the application behind it. */
export async function pasteIntoPreviousWindow(text: string): Promise<void> {
  hideWindow()
  await delay(FOCUS_RETURN_MS)
  if (!(await pasteText(text))) {
    notify('Não foi possível colar', 'O texto está no clipboard: pressione Ctrl+V.')
  }
}

/** Explains, in Portuguese, what changed between an English text and its corrected version. */
export async function explainCorrection(source: string, result: string): Promise<ExplainResult> {
  const controller = new AbortController()
  const outcome = await withProviders(controller.signal, (provider, maxRetries) =>
    completeText({ provider, system: EXPLAIN_PROMPT, user: wrapCorrection(source, result), signal: controller.signal, maxRetries })
  )
  if (!outcome) return { ok: false, message: 'Pedido cancelado.' }
  return outcome.ok ? { ok: true, text: outcome.value } : { ok: false, message: outcome.message }
}
