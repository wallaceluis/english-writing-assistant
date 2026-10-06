import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AssistApi } from '../shared/ipc'

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: AssistApi = {
  ready: () => ipcRenderer.send(IPC.ready),
  hide: () => ipcRenderer.invoke(IPC.hide),
  setAutoHide: (enabled) => ipcRenderer.invoke(IPC.setAutoHide, enabled),
  copy: (text) => ipcRenderer.invoke(IPC.copy, text),
  retry: () => ipcRenderer.invoke(IPC.retry),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  saveProvider: (patch) => ipcRenderer.invoke(IPC.saveProvider, patch),
  removeProvider: (id) => ipcRenderer.invoke(IPC.removeProvider, id),
  moveProvider: (id, direction) => ipcRenderer.invoke(IPC.moveProvider, id, direction),
  saveShortcut: (action, accelerator) => ipcRenderer.invoke(IPC.saveShortcut, action, accelerator),
  suspendShortcuts: (suspended) => ipcRenderer.invoke(IPC.suspendShortcuts, suspended),
  onSessionEvent: (listener) => subscribe(IPC.sessionEvent, listener),
  onNavigate: (listener) => subscribe(IPC.navigate, listener)
}

contextBridge.exposeInMainWorld('api', api)
