// Contract shared by the main process, the preload bridge and the renderer.
import type { ProviderId } from './providers'
import type { ShortcutAction, Shortcuts } from './shortcuts'

export const IPC = {
  ready: 'app:ready',
  navigate: 'app:navigate',
  sessionEvent: 'session:event',
  run: 'session:run',
  hide: 'window:hide',
  setAutoHide: 'window:set-auto-hide',
  copy: 'clipboard:write',
  getSettings: 'settings:get',
  saveProvider: 'settings:save-provider',
  removeProvider: 'settings:remove-provider',
  moveProvider: 'settings:move-provider',
  saveShortcut: 'settings:save-shortcut',
  savePreferences: 'settings:save-preferences',
  suspendShortcuts: 'shortcuts:suspend'
} as const

export type View = 'main' | 'settings'

/** `to-english` translates Portuguese or polishes English; `to-portuguese` is for reading what others wrote. */
export type Direction = 'to-english' | 'to-portuguese'

/** How the English should sound. */
export type Tone = 'professional' | 'casual' | 'concise'

export const TONES: ReadonlyArray<{ id: Tone; label: string }> = [
  { id: 'professional', label: 'Profissional' },
  { id: 'casual', label: 'Casual' },
  { id: 'concise', label: 'Conciso' }
]

export const MAX_SOURCE_LENGTH = 12_000
export const MAX_GLOSSARY_LENGTH = 2_000

/** What the model did: translated from Portuguese, or polished existing English. */
export type Mode = 'translated' | 'polished'

export type ErrorCode = 'missing-key' | 'invalid-key' | 'model' | 'quota' | 'rate-limit' | 'network' | 'too-long' | 'unknown'

/** Everything needed to produce a result again: retry, another tone, an entry reopened later. */
export type RunRequest = {
  source: string
  direction: Direction
  tone: Tone
}

// A session is one text going through the model. `source` is empty when there was no text to read.
export type SessionEvent =
  /** With `speak`, the result is read aloud as soon as it is done. */
  | ({ type: 'start'; id: number; speak: boolean } & RunRequest)
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

export type Preferences = {
  /** Tone used by the shortcuts; another one can be picked per result. */
  tone: Tone
  /** One entry per line: a term to keep as is, or "term = translation". */
  glossary: string
}

export type PublicSettings = {
  /** Active providers first, in fallback order. */
  providers: ProviderState[]
  shortcuts: Shortcuts
  preferences: Preferences
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
  /** Starts a session for a text the renderer already has. */
  run(request: RunRequest): Promise<void>
  getSettings(): Promise<PublicSettings>
  /** Saves and activates a provider. */
  saveProvider(patch: ProviderPatch): Promise<SaveResult>
  /** Forgets the provider's key and settings. */
  removeProvider(id: ProviderId): Promise<void>
  /** Moves an active provider up (-1) or down (1) the fallback chain. */
  moveProvider(id: ProviderId, direction: -1 | 1): Promise<void>
  /** Fails when the accelerator is invalid or taken by another program. */
  saveShortcut(action: ShortcutAction, accelerator: string): Promise<SaveResult>
  savePreferences(patch: Partial<Preferences>): Promise<void>
  /** Turns the global shortcuts off while the settings screen records a new one. */
  suspendShortcuts(suspended: boolean): Promise<void>
  /** Listeners return their unsubscribe function. */
  onSessionEvent(listener: (event: SessionEvent) => void): () => void
  onNavigate(listener: (view: View) => void): () => void
}
