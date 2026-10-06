import { app, BrowserWindow, screen } from 'electron'
import { join } from 'node:path'

const WINDOW_WIDTH = 624
const WINDOW_HEIGHT = 468

let win: BrowserWindow | null = null

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
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'English Assist',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', showWindow)

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
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  win.setPosition(
    Math.round(workArea.x + (workArea.width - WINDOW_WIDTH) / 2),
    Math.round(workArea.y + (workArea.height - WINDOW_HEIGHT) * 0.3)
  )
  win.show()
  win.focus()
}
