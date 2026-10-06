import { app, globalShortcut } from 'electron'

export const SHORTCUT = 'Control+Alt+E'
export const SHORTCUT_LABEL = 'Ctrl+Alt+E'

// Returns false when another application already owns the shortcut.
export function registerShortcut(onTrigger: () => void): boolean {
  app.on('will-quit', () => globalShortcut.unregisterAll())
  return globalShortcut.register(SHORTCUT, onTrigger)
}
