import { app, Menu, nativeImage, Tray } from 'electron'
import trayIcon from '../../resources/tray.png?asset'
import { SHORTCUT_LABEL } from './shortcut'

type TrayActions = {
  onOpen: () => void
}

// Kept at module scope so the tray icon is not garbage collected.
let tray: Tray | null = null

export function createTray({ onOpen }: TrayActions): Tray {
  tray = new Tray(nativeImage.createFromPath(trayIcon))
  tray.setToolTip(`English Assist — ${SHORTCUT_LABEL}`)
  tray.on('click', onOpen)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir English Assist', accelerator: SHORTCUT_LABEL, click: onOpen },
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
  return tray
}

export function notify(title: string, content: string): void {
  tray?.displayBalloon({ title, content })
}
