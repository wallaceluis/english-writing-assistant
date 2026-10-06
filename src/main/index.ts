import { app, Menu } from 'electron'
import { startSession } from './assistant'
import { registerIpcHandlers } from './ipc'
import { registerShortcut, SHORTCUT_LABEL } from './shortcut'
import { createTray, notify } from './tray'
import { createFloatingWindow, showWindow } from './window'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId('com.wallaceluis.english-assist')
  app.on('second-instance', showWindow)

  // Keep running in the tray even with no visible window.
  app.on('window-all-closed', () => {})

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    registerIpcHandlers()
    createFloatingWindow()
    createTray({ onAssist: startSession, onOpen: showWindow })

    if (!registerShortcut(startSession)) {
      notify(
        'Atalho indisponível',
        `${SHORTCUT_LABEL} já está em uso por outro aplicativo. Use o menu do ícone na bandeja.`
      )
    }
  })
}
