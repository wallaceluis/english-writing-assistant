import { clipboard } from 'electron'
import { IPC, type SessionEvent } from '../shared/ipc'
import { sendToRenderer, showWindow } from './window'

let lastId = 0

function emit(event: SessionEvent): void {
  void sendToRenderer(IPC.sessionEvent, event)
}

// Runs on every press of the global shortcut.
export function startSession(): void {
  const source = clipboard.readText().trim()
  showWindow()
  emit({ type: 'start', id: ++lastId, source })
}
