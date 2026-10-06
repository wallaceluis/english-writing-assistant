import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { DEFAULT_SHORTCUTS, formatAccelerator, SHORTCUT_ACTIONS, type ShortcutAction, type Shortcuts } from '../../../shared/shortcuts'
import { Kbd } from './Kbd'

type ShortcutsPanelProps = {
  shortcuts: Shortcuts
  onChanged: () => void
}

export function ShortcutsPanel({ shortcuts, onChanged }: ShortcutsPanelProps) {
  return (
    <div className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 py-2">
      <p className="px-2 pb-1 text-[12px] leading-5 text-zinc-400">
        Funcionam em qualquer programa. Clique em um atalho e pressione a nova combinação.
      </p>
      {SHORTCUT_ACTIONS.map((action) => (
        <ShortcutRow
          key={action.id}
          action={action.id}
          label={action.label}
          description={action.description}
          accelerator={shortcuts[action.id]}
          onChanged={onChanged}
        />
      ))}
    </div>
  )
}

// Translates a key press into an Electron accelerator; null while only modifiers are held.
function toAccelerator(event: KeyboardEvent): { accelerator: string } | { error: string } | null {
  const key =
    /^Key([A-Z])$/.exec(event.code)?.[1] ??
    /^Digit(\d)$/.exec(event.code)?.[1] ??
    (/^F\d{1,2}$/.test(event.code) ? event.code : event.code === 'Space' ? 'Space' : null)

  if (!key) {
    const modifierOnly = ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(event.key)
    return modifierOnly ? null : { error: 'Use letras, números, espaço ou teclas de função.' }
  }
  // A bare letter as a global shortcut would hijack normal typing everywhere.
  if (!event.ctrlKey && !event.altKey && !key.startsWith('F')) {
    return { error: 'Combine com Ctrl ou Alt.' }
  }

  const modifiers = [event.ctrlKey && 'Control', event.altKey && 'Alt', event.shiftKey && 'Shift'].filter(Boolean)
  return { accelerator: [...modifiers, key].join('+') }
}

type ShortcutRowProps = {
  action: ShortcutAction
  label: string
  description: string
  accelerator: string
  onChanged: () => void
}

function ShortcutRow({ action, label, description, accelerator, onChanged }: ShortcutRowProps) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recordingRef = useRef(false)

  // The current global shortcuts have to be off, or the system swallows those keys before they get here.
  const setRecordingState = (value: boolean) => {
    if (recordingRef.current === value) return
    recordingRef.current = value
    setRecording(value)
    void window.api.suspendShortcuts(value)
  }

  useEffect(() => () => setRecordingState(false), [])

  const save = async (next: string) => {
    const result = await window.api.saveShortcut(action, next)
    setRecordingState(false)
    if (result.ok) onChanged()
    else setError(result.message)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!recording) return
    event.preventDefault()
    // Keeps Esc and Enter from reaching the window-level handlers.
    event.stopPropagation()
    if (event.key === 'Escape') return setRecordingState(false)

    const parsed = toAccelerator(event)
    if (!parsed) return
    if ('error' in parsed) return setError(parsed.error)
    setError(null)
    void save(parsed.accelerator)
  }

  const isDefault = accelerator === DEFAULT_SHORTCUTS[action]

  return (
    <div className="rounded-xl px-2 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-zinc-100">{label}</p>
          <p className="mt-0.5 text-[11.5px] leading-4 text-zinc-500">{description}</p>
        </div>
        {!isDefault && !recording && (
          <button
            type="button"
            onClick={() => void save(DEFAULT_SHORTCUTS[action])}
            className="shrink-0 rounded text-[11.5px] text-zinc-500 hover:text-zinc-200 hover:underline"
          >
            Padrão
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null)
            setRecordingState(!recording)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setRecordingState(false)}
          aria-label={`Atalho para ${label}`}
          className={`flex h-9 min-w-[9.5rem] shrink-0 items-center justify-center gap-1 rounded-lg border px-3 transition-colors ${
            recording
              ? 'border-indigo-400/60 bg-indigo-400/10 text-[12px] text-indigo-200'
              : 'border-white/10 bg-white/[0.04] hover:border-white/20'
          }`}
        >
          {recording ? 'Pressione as teclas…' : formatAccelerator(accelerator).map((key) => <Kbd key={key}>{key}</Kbd>)}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-right text-[11.5px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  )
}
