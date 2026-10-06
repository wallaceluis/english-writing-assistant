import { app, Menu } from 'electron'
import { registerShortcut, SHORTCUT_LABEL } from './shortcut'
import { createTray, notify } from './tray'
import { createFloatingWindow, showWindow, toggleWindow } from './window'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId('com.wallaceluis.english-assist')
  app.on('second-instance', showWindow)

  // Keep running in the tray even with no visible window.
  app.on('window-all-closed', () => {})

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    createFloatingWindow()
    createTray({ onOpen: showWindow })

    if (!registerShortcut(toggleWindow)) {
      notify(
        'Atalho indisponível',
        `${SHORTCUT_LABEL} já está em uso por outro aplicativo. Abra o English Assist pelo ícone da bandeja.`
      )
    }
  })
}
