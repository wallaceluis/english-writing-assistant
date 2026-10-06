import { app, Menu } from 'electron'
import { createFloatingWindow } from './window'

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createFloatingWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
