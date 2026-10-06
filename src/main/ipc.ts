import { clipboard, ipcMain } from 'electron'
import {
  IPC,
  MAX_SOURCE_LENGTH,
  TONES,
  type ExplainResult,
  type ProviderPatch,
  type RunRequest,
  type SaveResult,
  type SpeechResult
} from '../shared/ipc'
import { isProviderId } from '../shared/providers'
import { isShortcutAction } from '../shared/shortcuts'
import { explainCorrection, pasteIntoPreviousWindow, runRequest } from './assistant'
import { clearHistory, listHistory } from './history'
import { getPublicSettings, moveProvider, removeProvider, savePreferences, saveProvider } from './settings'
import { changeShortcut, suspendShortcuts } from './shortcut'
import { refreshTray } from './tray'
import { synthesize } from './tts'
import { checkForUpdates } from './updater'
import { hideWindow, markRendererReady, setAutoHide } from './window'

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value.trim() : undefined)

export function registerIpcHandlers(): void {
  ipcMain.on(IPC.ready, markRendererReady)
  ipcMain.handle(IPC.hide, hideWindow)
  ipcMain.handle(IPC.setAutoHide, (_event, enabled: unknown) => setAutoHide(enabled !== false))
  ipcMain.handle(IPC.copy, (_event, value: unknown) => {
    if (typeof value === 'string') clipboard.writeText(value)
  })
  ipcMain.handle(IPC.run, (_event, request: Partial<Record<keyof RunRequest, unknown>> | null) => {
    const { source, direction, tone } = request ?? {}
    if (typeof source !== 'string' || source.length > MAX_SOURCE_LENGTH) return
    if (direction !== 'to-english' && direction !== 'to-portuguese') return
    const known = TONES.find((candidate) => candidate.id === tone)
    if (known) return runRequest({ source, direction, tone: known.id })
  })
  ipcMain.handle(IPC.replace, (_event, value: unknown) => {
    if (typeof value === 'string' && value) return pasteIntoPreviousWindow(value)
  })
  ipcMain.handle(IPC.explain, (_event, source: unknown, result: unknown): ExplainResult | Promise<ExplainResult> => {
    const valid = (value: unknown): value is string => typeof value === 'string' && value.length <= MAX_SOURCE_LENGTH * 2
    return valid(source) && valid(result) ? explainCorrection(source, result) : { ok: false, message: 'Texto inválido.' }
  })
  ipcMain.handle(IPC.synthesize, (_event, value: unknown): SpeechResult | Promise<SpeechResult> =>
    typeof value === 'string' && value ? synthesize(value) : { ok: false, message: 'Texto inválido.' }
  )
  ipcMain.handle(IPC.checkForUpdates, () => checkForUpdates(true))
  ipcMain.handle(IPC.getHistory, listHistory)
  ipcMain.handle(IPC.clearHistory, clearHistory)
  ipcMain.handle(IPC.savePreferences, (_event, patch: unknown) => {
    if (patch && typeof patch === 'object') savePreferences(patch)
  })
  ipcMain.handle(IPC.getSettings, getPublicSettings)
  ipcMain.handle(IPC.saveProvider, (_event, patch: Partial<Record<keyof ProviderPatch, unknown>> | null): SaveResult => {
    if (!isProviderId(patch?.id)) return { ok: false, message: 'Provedor desconhecido.' }
    return saveProvider({ id: patch.id, apiKey: text(patch.apiKey), model: text(patch.model), baseURL: text(patch.baseURL) })
  })
  ipcMain.handle(IPC.removeProvider, (_event, id: unknown) => {
    if (isProviderId(id)) removeProvider(id)
  })
  ipcMain.handle(IPC.saveShortcut, (_event, action: unknown, accelerator: unknown): SaveResult => {
    if (!isShortcutAction(action) || typeof accelerator !== 'string' || accelerator.length > 40) {
      return { ok: false, message: 'Atalho inválido.' }
    }
    const result = changeShortcut(action, accelerator)
    if (result.ok) refreshTray()
    return result
  })
  ipcMain.handle(IPC.suspendShortcuts, (_event, suspended: unknown) => suspendShortcuts(suspended === true))
  ipcMain.handle(IPC.moveProvider, (_event, id: unknown, direction: unknown) => {
    if (isProviderId(id) && (direction === -1 || direction === 1)) moveProvider(id, direction)
  })
}
