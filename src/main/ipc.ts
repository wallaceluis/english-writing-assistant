import { clipboard, ipcMain } from 'electron'
import { IPC, type ProviderPatch, type SaveResult } from '../shared/ipc'
import { isProviderId } from '../shared/providers'
import { retrySession } from './assistant'
import { getPublicSettings, moveProvider, removeProvider, saveProvider } from './settings'
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
  ipcMain.handle(IPC.saveProvider, (_event, patch: Partial<Record<keyof ProviderPatch, unknown>> | null): SaveResult => {
    if (!isProviderId(patch?.id)) return { ok: false, message: 'Provedor desconhecido.' }
    return saveProvider({ id: patch.id, apiKey: text(patch.apiKey), model: text(patch.model), baseURL: text(patch.baseURL) })
  })
  ipcMain.handle(IPC.removeProvider, (_event, id: unknown) => {
    if (isProviderId(id)) removeProvider(id)
  })
  ipcMain.handle(IPC.moveProvider, (_event, id: unknown, direction: unknown) => {
    if (isProviderId(id) && (direction === -1 || direction === 1)) moveProvider(id, direction)
  })
}
