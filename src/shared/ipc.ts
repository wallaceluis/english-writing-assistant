// Contract shared by the main process, the preload bridge and the renderer.

export const IPC = {
  ready: 'app:ready',
  sessionEvent: 'session:event',
  hide: 'window:hide',
  copy: 'clipboard:write'
} as const

// A session is one press of the global shortcut. `source` is empty when the clipboard has no text.
export type SessionEvent = { type: 'start'; id: number; source: string }

export interface AssistApi {
  /** Tells the main process the renderer is listening for events. */
  ready(): void
  hide(): Promise<void>
  copy(text: string): Promise<void>
  /** Returns the unsubscribe function. */
  onSessionEvent(listener: (event: SessionEvent) => void): () => void
}
