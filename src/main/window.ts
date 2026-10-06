import { app, BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import appIcon from '../../resources/icon.png?asset'
import { IPC, type View } from '../shared/ipc'

const WINDOW_WIDTH = 624
const WINDOW_HEIGHT = 468

let win: BrowserWindow | null = null
let quitting = false
let autoHide = true
// When losing focus last minimized the window, to tell a taskbar click that wants to close it.
let blurMinimizedAt = 0
const TASKBAR_TOGGLE_MS = 300

// Events sent before the renderer has subscribed would be lost, so they wait for its handshake.
let resolveRendererReady: () => void
const rendererReady = new Promise<void>((resolve) => {
  resolveRendererReady = resolve
})

export function markRendererReady(): void {
  resolveRendererReady()
}

export async function sendToRenderer(channel: string, payload: unknown): Promise<void> {
  await rendererReady
  // The window is already gone when the app quits in the middle of a stream.
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}

export function createFloatingWindow(): BrowserWindow {
  win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    title: 'English Assist',
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Closing or clicking away only minimizes the window, which keeps its button on the taskbar.
  app.on('before-quit', () => {
    quitting = true
  })
  win.on('close', (event) => {
    if (quitting) return
    event.preventDefault()
    hideWindow()
  })
  win.on('blur', () => {
    if (!win || win.isMinimized() || !autoHide || win.webContents.isDevToolsOpened()) return
    blurMinimizedAt = Date.now()
    hideWindow()
  })
  // Clicking the taskbar button of the open window first blurs it (minimizing it) and then restores it.
  win.on('restore', () => {
    if (Date.now() - blurMinimizedAt < TASKBAR_TOGGLE_MS) hideWindow()
  })
  // Starts minimized, not hidden, so the taskbar button is there from the beginning.
  win.minimize()

  // Links open in the default browser; the window itself never leaves the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  if (!app.isPackaged) {
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') win?.webContents.toggleDevTools()
    })
  }

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// Opens on whichever monitor the cursor is in, slightly above the vertical center.
export function showWindow(): void {
  if (!win) return
  blurMinimizedAt = 0
  if (win.isMinimized()) win.restore()
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  // setBounds rather than setPosition: the size can drift when moving between monitors with different scaling.
  win.setBounds({
    x: Math.round(workArea.x + (workArea.width - WINDOW_WIDTH) / 2),
    y: Math.round(workArea.y + (workArea.height - WINDOW_HEIGHT) * 0.3),
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT
  })
  win.show()
  win.focus()
}

export function hideWindow(): void {
  win?.minimize()
}

export function setAutoHide(enabled: boolean): void {
  autoHide = enabled
}

export async function openView(view: View): Promise<void> {
  await sendToRenderer(IPC.navigate, view)
  showWindow()
}
