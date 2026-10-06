// Contract shared by the main process, the preload bridge and the renderer.
import type { ProviderId } from './providers'

export const IPC = {
  ready: 'app:ready',
  navigate: 'app:navigate',
  sessionEvent: 'session:event',
  retry: 'session:retry',
  hide: 'window:hide',
  setAutoHide: 'window:set-auto-hide',
  copy: 'clipboard:write',
  getSettings: 'settings:get',
  saveProvider: 'settings:save-provider',
  removeProvider: 'settings:remove-provider',
  moveProvider: 'settings:move-provider'
} as const

export type View = 'main' | 'settings'

/** What the model did: translated from Portuguese, or polished existing English. */
export type Mode = 'translated' | 'polished'

export type ErrorCode = 'missing-key' | 'invalid-key' | 'model' | 'quota' | 'rate-limit' | 'network' | 'too-long' | 'unknown'

// A session is one press of the global shortcut. `source` is empty when the clipboard has no text.
export type SessionEvent =
  | { type: 'start'; id: number; source: string }
  /** A provider is about to answer. With `fallback`, the previous one failed and its partial text is discarded. */
  | { type: 'provider'; id: number; name: string; model: string; fallback: boolean }
  | { type: 'mode'; id: number; mode: Mode }
  | { type: 'delta'; id: number; delta: string }
  | { type: 'done'; id: number; text: string }
  | { type: 'error'; id: number; code: ErrorCode; message: string }

/** Never carries the key itself, only whether one exists and its last characters. */
export type ProviderState = {
  id: ProviderId
  /** Configured and taking part in the fallback chain. */
  active: boolean
  keySource: 'app' | 'env' | null
  keyHint: string | null
  model: string
  baseURL: string
}

export type PublicSettings = {
  /** Active providers first, in fallback order. */
  providers: ProviderState[]
}

export type ProviderPatch = {
  id: ProviderId
  /** Omitted keeps the saved key. */
  apiKey?: string
  /** Empty falls back to the provider's default. */
  model?: string
  baseURL?: string
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
  /** Saves and activates a provider. */
  saveProvider(patch: ProviderPatch): Promise<SaveResult>
  /** Forgets the provider's key and settings. */
  removeProvider(id: ProviderId): Promise<void>
  /** Moves an active provider up (-1) or down (1) the fallback chain. */
  moveProvider(id: ProviderId, direction: -1 | 1): Promise<void>
  /** Listeners return their unsubscribe function. */
  onSessionEvent(listener: (event: SessionEvent) => void): () => void
  onNavigate(listener: (view: View) => void): () => void
}
