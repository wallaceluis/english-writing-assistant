import { clipboard, ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import { hideWindow, markRendererReady } from './window'

export function registerIpcHandlers(): void {
  ipcMain.on(IPC.ready, markRendererReady)
  ipcMain.handle(IPC.hide, hideWindow)
  ipcMain.handle(IPC.copy, (_event, text: unknown) => {
    if (typeof text === 'string') clipboard.writeText(text)
  })
}
