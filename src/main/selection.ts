import { app, clipboard } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'

// Electron can neither read another application's selection nor type into it, so a helper presses
// Ctrl+C / Ctrl+V in the focused window. It is a long-lived PowerShell process because starting one
// per shortcut takes too long. Each line on stdin is a command:
//   copy  -> "copied", or "none" when the clipboard did not change (nothing was selected)
//   paste -> "pasted"
const HELPER_SCRIPT = `
Add-Type -Namespace EnglishAssist -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vk);
[DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();
'@
$native = [EnglishAssist.Native]
$none = [UIntPtr]::Zero
$VK_SHIFT = 0x10; $VK_CTRL = 0x11; $VK_ALT = 0x12; $VK_C = 0x43; $VK_V = 0x56; $VK_WIN = 0x5B; $KEY_UP = 2
function IsDown($vk) { return ($native::GetAsyncKeyState($vk) -band 0x8000) -ne 0 }

# The shortcut's own modifiers, still held, would turn Ctrl+C into Ctrl+Alt+C.
function WaitForModifiers {
  $deadline = [DateTime]::UtcNow.AddMilliseconds(800)
  while (((IsDown $VK_ALT) -or (IsDown $VK_SHIFT) -or (IsDown $VK_WIN)) -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 10
  }
  if (IsDown $VK_ALT) { $native::keybd_event($VK_ALT, 0, $KEY_UP, $none) }
}

function PressWithCtrl($vk) {
  $ctrlHeld = IsDown $VK_CTRL
  if (-not $ctrlHeld) { $native::keybd_event($VK_CTRL, 0, 0, $none) }
  $native::keybd_event($vk, 0, 0, $none)
  $native::keybd_event($vk, 0, $KEY_UP, $none)
  if (-not $ctrlHeld) { $native::keybd_event($VK_CTRL, 0, $KEY_UP, $none) }
}

while ($null -ne ($command = [Console]::In.ReadLine())) {
  WaitForModifiers

  if ($command -eq 'paste') {
    PressWithCtrl $VK_V
    [Console]::Out.WriteLine('pasted')
    continue
  }

  $before = $native::GetClipboardSequenceNumber()
  PressWithCtrl $VK_C
  $reply = 'none'
  $deadline = [DateTime]::UtcNow.AddMilliseconds(400)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($native::GetClipboardSequenceNumber() -ne $before) { $reply = 'copied'; break }
    Start-Sleep -Milliseconds 10
  }
  [Console]::Out.WriteLine($reply)
}
`

// Longer than the helper's own waits combined.
const REPLY_TIMEOUT_MS = 1500
// The sequence number changes slightly before the new content can be read.
const CLIPBOARD_SETTLE_MS = 40
// The target application reads the clipboard some time after receiving Ctrl+V.
const PASTE_SETTLE_MS = 300

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

let helper: ChildProcessWithoutNullStreams | null = null
let pending: ((reply: string | null) => void) | null = null

export function startSelectionHelper(): void {
  if (process.platform !== 'win32') return

  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-NoLogo', '-NonInteractive', '-EncodedCommand', Buffer.from(HELPER_SCRIPT, 'utf16le').toString('base64')],
    { windowsHide: true }
  )
  helper = child

  const settle = (reply: string | null): void => {
    pending?.(reply)
    pending = null
  }
  createInterface({ input: child.stdout }).on('line', (line) => settle(line.trim()))
  // Without the helper the shortcuts still work on whatever is already in the clipboard.
  child.on('error', () => settle(null))
  child.on('exit', () => {
    if (helper === child) helper = null
    settle(null)
  })
  child.stdin.on('error', () => {})
  app.on('will-quit', () => child.kill())
}

// Null when the helper is unavailable, busy or too slow.
function send(command: 'copy' | 'paste'): Promise<string | null> {
  return new Promise((resolve) => {
    if (!helper || pending) return resolve(null)
    const timer = setTimeout(() => {
      pending = null
      resolve(null)
    }, REPLY_TIMEOUT_MS)
    pending = (reply) => {
      clearTimeout(timer)
      resolve(reply)
    }
    helper.stdin.write(`${command}\n`)
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
 * The text selected in the focused application, or null when nothing could be copied.
 * Must run before our own window takes the focus.
 */
export async function readSelection(): Promise<string | null> {
  const previous = snapshotClipboard()
  if ((await send('copy')) !== 'copied') return null

  await delay(CLIPBOARD_SETTLE_MS)
  const selected = clipboard.readText().trim()
  // The selection was only borrowed: give the user their clipboard back.
  if (previous) clipboard.write(previous)
  return selected || null
}

export async function readSelectionOrClipboard(): Promise<string> {
  return (await readSelection()) ?? clipboard.readText().trim()
}

/** Types `text` over the selection of the focused application, through the clipboard. */
export async function pasteText(text: string): Promise<boolean> {
  const previous = snapshotClipboard()
  clipboard.writeText(text)
  const pasted = (await send('paste')) === 'pasted'
  if (pasted) await delay(PASTE_SETTLE_MS)
  // When the paste failed the text stays in the clipboard, so the user can still press Ctrl+V.
  if (pasted && previous) clipboard.write(previous)
  return pasted
}
