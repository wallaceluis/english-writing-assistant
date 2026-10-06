// Global shortcuts, stored as Electron accelerators ("Control+Alt+E").

export type ShortcutAction = 'assist' | 'listen' | 'portuguese'

export type Shortcuts = Record<ShortcutAction, string>

export const DEFAULT_SHORTCUTS: Shortcuts = {
  assist: 'Control+Alt+E',
  listen: 'Control+Alt+L',
  portuguese: 'Control+Alt+P'
}

export const SHORTCUT_ACTIONS: ReadonlyArray<{ id: ShortcutAction; label: string; description: string }> = [
  { id: 'assist', label: 'Traduzir seleção', description: 'Abre a janela com a versão em inglês do texto selecionado.' },
  { id: 'listen', label: 'Traduzir e ouvir', description: 'Faz o mesmo e lê o resultado em voz alta assim que fica pronto.' },
  { id: 'portuguese', label: 'Traduzir para português', description: 'Para entender uma mensagem recebida em inglês.' }
]

export function isShortcutAction(value: unknown): value is ShortcutAction {
  return SHORTCUT_ACTIONS.some((action) => action.id === value)
}

/** Key names as shown to the user: "Control+Alt+E" becomes ["Ctrl", "Alt", "E"]. */
export function formatAccelerator(accelerator: string): string[] {
  return accelerator.split('+').map((part) => (part === 'Control' ? 'Ctrl' : part))
}
