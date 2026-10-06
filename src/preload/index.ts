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
  copy: (text) => ipcRenderer.invoke(IPC.copy, text),
  onSessionEvent: (listener) => subscribe(IPC.sessionEvent, listener)
}

contextBridge.exposeInMainWorld('api', api)
