// Contract shared by the main process, the preload bridge and the renderer.

export const IPC = {
  ready: 'app:ready',
  navigate: 'app:navigate',
  sessionEvent: 'session:event',
  retry: 'session:retry',
  hide: 'window:hide',
  setAutoHide: 'window:set-auto-hide',
  copy: 'clipboard:write',
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  clearApiKey: 'settings:clear-api-key'
} as const

export const DEFAULT_MODEL = 'gpt-5.4-mini'

export type View = 'main' | 'settings'

/** What the model did: translated from Portuguese, or polished existing English. */
export type Mode = 'translated' | 'polished'

export type ErrorCode = 'missing-key' | 'invalid-key' | 'model' | 'quota' | 'rate-limit' | 'network' | 'too-long' | 'unknown'

// A session is one press of the global shortcut. `source` is empty when the clipboard has no text.
export type SessionEvent =
  | { type: 'start'; id: number; source: string }
  | { type: 'mode'; id: number; mode: Mode }
  | { type: 'delta'; id: number; delta: string }
  | { type: 'done'; id: number; text: string }
  | { type: 'error'; id: number; code: ErrorCode; message: string }

/** Never carries the key itself, only whether one exists and its last characters. */
export type PublicSettings = {
  hasApiKey: boolean
  keySource: 'app' | 'env' | null
  keyHint: string | null
  model: string
}

export type SettingsPatch = {
  apiKey?: string
  /** Empty string resets to the default model. */
  model?: string
}

export type SaveResult = { ok: true } | { ok: false; message: string }

export interface AssistApi {
  /** Tells the main process the renderer is listening for events. */
  ready(): void
  hide(): Promise<void>
  /** When false, the window stays open after losing focus. */
  setAutoHide(enabled: boolean): Promise<void>
  copy(text: string): Promise<void>
  /** Runs the last captured text through the model again. */
  retry(): Promise<void>
  getSettings(): Promise<PublicSettings>
  saveSettings(patch: SettingsPatch): Promise<SaveResult>
  clearApiKey(): Promise<void>
  /** Listeners return their unsubscribe function. */
  onSessionEvent(listener: (event: SessionEvent) => void): () => void
  onNavigate(listener: (view: View) => void): () => void
}
