import { app, clipboard } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'

// Electron cannot read another application's selection, so a helper presses Ctrl+C in the focused
// window. It is a long-lived PowerShell process because starting one per shortcut takes too long.
// For each line on stdin it answers "copied" or "none" (the clipboard did not change).
const HELPER_SCRIPT = `
Add-Type -Namespace EnglishAssist -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vk);
[DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();
'@
$native = [EnglishAssist.Native]
$none = [UIntPtr]::Zero
$VK_SHIFT = 0x10; $VK_CTRL = 0x11; $VK_ALT = 0x12; $VK_C = 0x43; $VK_E = 0x45; $VK_WIN = 0x5B; $KEY_UP = 2
function IsDown($vk) { return ($native::GetAsyncKeyState($vk) -band 0x8000) -ne 0 }

while ($null -ne [Console]::In.ReadLine()) {
  # The shortcut's own keys, still held, would turn Ctrl+C into Ctrl+Alt+C.
  $deadline = [DateTime]::UtcNow.AddMilliseconds(800)
  while (((IsDown $VK_ALT) -or (IsDown $VK_E) -or (IsDown $VK_SHIFT) -or (IsDown $VK_WIN)) -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 10
  }
  if (IsDown $VK_ALT) { $native::keybd_event($VK_ALT, 0, $KEY_UP, $none) }

  $before = $native::GetClipboardSequenceNumber()
  $ctrlHeld = IsDown $VK_CTRL
  if (-not $ctrlHeld) { $native::keybd_event($VK_CTRL, 0, 0, $none) }
  $native::keybd_event($VK_C, 0, 0, $none)
  $native::keybd_event($VK_C, 0, $KEY_UP, $none)
  if (-not $ctrlHeld) { $native::keybd_event($VK_CTRL, 0, $KEY_UP, $none) }

  $reply = 'none'
  $deadline = [DateTime]::UtcNow.AddMilliseconds(400)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($native::GetClipboardSequenceNumber() -ne $before) { $reply = 'copied'; break }
    Start-Sleep -Milliseconds 10
  }
  [Console]::Out.WriteLine($reply)
}
`

// Longer than the helper's own two waits combined.
const COPY_TIMEOUT_MS = 1500
// The sequence number changes slightly before the new content can be read.
const CLIPBOARD_SETTLE_MS = 40

let helper: ChildProcessWithoutNullStreams | null = null
let pending: ((reply: string) => void) | null = null

export function startSelectionHelper(): void {
  if (process.platform !== 'win32') return

  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-NoLogo', '-NonInteractive', '-EncodedCommand', Buffer.from(HELPER_SCRIPT, 'utf16le').toString('base64')],
    { windowsHide: true }
  )
  helper = child

  const settle = (reply: string): void => {
    pending?.(reply)
    pending = null
  }
  createInterface({ input: child.stdout }).on('line', (line) => settle(line.trim()))
  // Without the helper the shortcut still works on whatever is already in the clipboard.
  child.on('error', () => settle('none'))
  child.on('exit', () => {
    if (helper === child) helper = null
    settle('none')
  })
  child.stdin.on('error', () => {})
  app.on('will-quit', () => child.kill())
}

function copySelection(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!helper || pending) return resolve(false)
    const timer = setTimeout(() => {
      pending = null
      resolve(false)
    }, COPY_TIMEOUT_MS)
    pending = (reply) => {
      clearTimeout(timer)
      resolve(reply === 'copied')
    }
    helper.stdin.write('copy\n')
  })
}

type ClipboardText = { text: string; html?: string; rtf?: string }

// Only text can be put back faithfully; images and files are left alone.
function snapshotClipboard(): ClipboardText | null {
  const formats = clipboard.availableFormats()
  if (formats.length === 0 || !formats.every((format) => format.startsWith('text/'))) return null
  return { text: clipboard.readText(), html: clipboard.readHTML() || undefined, rtf: clipboard.readRTF() || undefined }
}

/**
 * The text selected in the focused application, or the clipboard text when nothing is selected.
 * Must run before our own window takes the focus.
 */
export async function readSelectionOrClipboard(): Promise<string> {
  const previous = snapshotClipboard()
  if (!(await copySelection())) return clipboard.readText().trim()

  await new Promise((resolve) => setTimeout(resolve, CLIPBOARD_SETTLE_MS))
  const selected = clipboard.readText().trim()
  // The selection was only borrowed: give the user their clipboard back.
  if (previous) clipboard.write(previous)
  return selected
}
