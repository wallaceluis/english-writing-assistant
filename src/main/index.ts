import { app, Menu } from 'electron'
import { startSession } from './assistant'
import { registerIpcHandlers } from './ipc'
import { getApiKey } from './settings'
import { registerShortcut, SHORTCUT_LABEL } from './shortcut'
import { createTray, notify } from './tray'
import { createFloatingWindow, openView, showWindow } from './window'

// Optional .env at the project root (OPENAI_API_KEY, OPENAI_MODEL) for development.
if (!app.isPackaged) {
  try {
    process.loadEnvFile()
  } catch {
    // No .env file: the key comes from the settings screen instead.
  }
}

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
    createTray({
      onAssist: () => void startSession(),
      onOpen: showWindow,
      onSettings: () => void openView('settings')
    })

    if (!registerShortcut(() => void startSession())) {
      notify(
        'Atalho indisponível',
        `${SHORTCUT_LABEL} já está em uso por outro aplicativo. Use o menu do ícone na bandeja.`
      )
    }

    // First run: nothing works without a key, so start on the settings screen.
    if (!getApiKey()) void openView('settings')
  })
}
