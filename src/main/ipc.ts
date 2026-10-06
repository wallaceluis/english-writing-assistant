import { clipboard, ipcMain } from 'electron'
import { IPC, type SettingsPatch } from '../shared/ipc'
import { retrySession } from './assistant'
import { clearApiKey, getPublicSettings, saveSettings } from './settings'
import { hideWindow, markRendererReady, setAutoHide } from './window'

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value.trim() : undefined)

export function registerIpcHandlers(): void {
  ipcMain.on(IPC.ready, markRendererReady)
  ipcMain.handle(IPC.hide, hideWindow)
  ipcMain.handle(IPC.setAutoHide, (_event, enabled: unknown) => setAutoHide(enabled !== false))
  ipcMain.handle(IPC.copy, (_event, value: unknown) => {
    if (typeof value === 'string') clipboard.writeText(value)
  })
  ipcMain.handle(IPC.retry, retrySession)
  ipcMain.handle(IPC.getSettings, getPublicSettings)
  ipcMain.handle(IPC.saveSettings, (_event, patch: Partial<Record<keyof SettingsPatch, unknown>> | null) =>
    saveSettings({ apiKey: text(patch?.apiKey), model: text(patch?.model) })
  )
  ipcMain.handle(IPC.clearApiKey, clearApiKey)
}
