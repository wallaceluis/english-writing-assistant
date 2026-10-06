import { app, globalShortcut } from 'electron'
import type { SaveResult } from '../shared/ipc'
import { SHORTCUT_ACTIONS, type ShortcutAction } from '../shared/shortcuts'
import { getShortcuts, saveShortcut } from './settings'

type Handlers = Record<ShortcutAction, () => void>

let handlers: Handlers | null = null
let suspended = false

// False when the accelerator is malformed or another application already owns it.
function tryRegister(accelerator: string, handler: () => void): boolean {
  try {
    return globalShortcut.register(accelerator, handler)
  } catch {
    return false
  }
}

/** Registers every shortcut again and returns the ones that could not be registered. */
function registerAll(): ShortcutAction[] {
  globalShortcut.unregisterAll()
  if (!handlers) return []
  const shortcuts = getShortcuts()
  return SHORTCUT_ACTIONS.map((action) => action.id).filter((id) => !tryRegister(shortcuts[id], handlers![id]))
}

export function initShortcuts(actions: Handlers): ShortcutAction[] {
  handlers = actions
  app.on('will-quit', () => globalShortcut.unregisterAll())
  // The settings screen may lose the focus while still recording keys.
  app.on('browser-window-blur', () => suspendShortcuts(false))
  return registerAll()
}

// While the settings screen records a new shortcut, the current ones must reach it as plain key presses.
export function suspendShortcuts(value: boolean): void {
  if (suspended === value) return
  suspended = value
  if (value) globalShortcut.unregisterAll()
  else registerAll()
}

export function changeShortcut(action: ShortcutAction, accelerator: string): SaveResult {
  if (!handlers) return { ok: false, message: 'Os atalhos ainda não foram iniciados.' }

  const taken = SHORTCUT_ACTIONS.find((other) => other.id !== action && getShortcuts()[other.id] === accelerator)
  if (taken) return { ok: false, message: `Esse atalho já é usado por "${taken.label}".` }

  // Registering is the only way to find out whether the system accepts the accelerator.
  globalShortcut.unregisterAll()
  const accepted = tryRegister(accelerator, handlers[action])
  if (accepted) saveShortcut(action, accelerator)

  if (suspended) globalShortcut.unregisterAll()
  else registerAll()

  return accepted ? { ok: true } : { ok: false, message: 'Esse atalho é inválido ou já está em uso por outro programa.' }
}
