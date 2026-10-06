import { app, Menu } from 'electron'
import { formatAccelerator } from '../shared/shortcuts'
import { startSession, startSessionFromClipboard } from './assistant'
import { registerIpcHandlers } from './ipc'
import { startSelectionHelper } from './selection'
import { getActiveProviders, getShortcuts } from './settings'
import { initShortcuts } from './shortcut'
import { createTray, notify } from './tray'
import { createFloatingWindow, openView, showWindow } from './window'

// Optional .env at the project root (see .env.example) for development.
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
    startSelectionHelper()
    createFloatingWindow()
    createTray({
      onAssist: () => void startSessionFromClipboard({ direction: 'to-english' }),
      onListen: () => void startSessionFromClipboard({ direction: 'to-english', speak: true }),
      onPortuguese: () => void startSessionFromClipboard({ direction: 'to-portuguese' }),
      onOpen: showWindow,
      onSettings: () => void openView('settings')
    })

    const unavailable = initShortcuts({
      assist: () => void startSession({ direction: 'to-english' }),
      listen: () => void startSession({ direction: 'to-english', speak: true }),
      portuguese: () => void startSession({ direction: 'to-portuguese' })
    })
    if (unavailable.length > 0) {
      const shortcuts = getShortcuts()
      const keys = unavailable.map((action) => formatAccelerator(shortcuts[action]).join('+')).join(' e ')
      notify('Atalho indisponível', `${keys}: já em uso por outro aplicativo. Troque em Configurações → Atalhos.`)
    }

    // First run: nothing works without a provider, so start on the settings screen.
    if (getActiveProviders().length === 0) void openView('settings')
  })
}
