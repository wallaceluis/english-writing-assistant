import { app, Menu, nativeImage, Tray } from 'electron'
import trayIcon from '../../resources/tray.png?asset'
import { formatAccelerator } from '../shared/shortcuts'
import { getShortcuts } from './settings'

type TrayActions = {
  onAssist: () => void
  onListen: () => void
  onOpen: () => void
  onSettings: () => void
}

// Kept at module scope so the tray icon is not garbage collected.
let tray: Tray | null = null
let actions: TrayActions | null = null

export function createTray(trayActions: TrayActions): Tray {
  actions = trayActions
  tray = new Tray(nativeImage.createFromPath(trayIcon))
  tray.on('click', trayActions.onOpen)
  refreshTray()
  return tray
}

/** Rebuilds the tooltip and the menu, which show the current shortcuts. */
export function refreshTray(): void {
  if (!tray || !actions) return
  const shortcuts = getShortcuts()
  const label = (accelerator: string): string => formatAccelerator(accelerator).join('+')

  tray.setToolTip(`English Assist — ${label(shortcuts.assist)}`)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Melhorar texto copiado', accelerator: label(shortcuts.assist), click: actions.onAssist },
      { label: 'Melhorar e ouvir texto copiado', accelerator: label(shortcuts.listen), click: actions.onListen },
      { label: 'Abrir janela', click: actions.onOpen },
      { label: 'Configurações…', click: actions.onSettings },
      { type: 'separator' },
      {
        label: 'Iniciar com o Windows',
        type: 'checkbox',
        // In development this would register the bare Electron binary.
        enabled: app.isPackaged,
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked })
      },
      { type: 'separator' },
      { label: 'Sair', click: () => app.quit() }
    ])
  )
}

export function notify(title: string, content: string): void {
  tray?.displayBalloon({ title, content })
}
