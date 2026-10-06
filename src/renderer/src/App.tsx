import { useCallback, useEffect, useRef, useState } from 'react'
import type { View } from '../../shared/ipc'
import { DEFAULT_SHORTCUTS, formatAccelerator } from '../../shared/shortcuts'
import { IconButton } from './components/Button'
import { EmptyState } from './components/EmptyState'
import { Footer } from './components/Footer'
import { SlidersIcon } from './components/icons'
import { ResultView } from './components/ResultView'
import { SettingsView } from './components/SettingsView'
import { Badge, TitleBar } from './components/TitleBar'
import { useAssistant, type Session } from './hooks/useAssistant'
import { useSpeech } from './hooks/useSpeech'

// Long enough to see the "Copiado" confirmation before the window goes away.
const HIDE_AFTER_COPY_MS = 450

const hide = (): void => void window.api.hide()
const retry = (): void => void window.api.retry()

export default function App() {
  const session = useAssistant()
  const [view, setView] = useState<View>('main')
  const [copied, setCopied] = useState(false)
  const hideTimer = useRef<number>()
  const speech = useSpeech()
  const [assistShortcut, setAssistShortcut] = useState(DEFAULT_SHORTCUTS.assist)
  const spokenFor = useRef<number>()

  // Reloaded whenever the settings screen closes, where the shortcut can change.
  useEffect(() => {
    if (view === 'main') void window.api.getSettings().then((settings) => setAssistShortcut(settings.shortcuts.assist))
  }, [view])

  useEffect(() => window.api.onNavigate(setView), [])

  // A new session always takes over the window.
  useEffect(() => {
    window.clearTimeout(hideTimer.current)
    setCopied(false)
    speech.stop()
    if (session) setView('main')
  }, [session?.id, speech.stop])

  // The "translate and listen" shortcut: speak once, as soon as the text is complete.
  // Declared after the effect above, which silences the previous session.
  useEffect(() => {
    if (!session?.speak || session.status !== 'done' || !speech.available || spokenFor.current === session.id) return
    spokenFor.current = session.id
    speech.speak(session.result)
  }, [session, speech.available, speech.speak])

  const result = session?.status === 'done' ? session.result : ''
  const canCopy = view === 'main' && result !== ''
  const canRetry =
    view === 'main' &&
    (session?.status === 'done' || (session?.status === 'error' && session.error?.code !== 'missing-key'))

  const copy = useCallback(async () => {
    if (!canCopy || copied) return
    setCopied(true)
    await window.api.copy(result)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      hide()
      setCopied(false)
    }, HIDE_AFTER_COPY_MS)
  }, [canCopy, copied, result])

  const toggleListen = useCallback(() => {
    if (speech.speaking) speech.stop()
    else if (canCopy) speech.speak(result)
  }, [speech.speaking, speech.stop, speech.speak, canCopy, result])

  const closeSettings = useCallback(() => {
    setView('main')
    // The failed request was most likely waiting on a provider that has just been configured.
    if (session?.status === 'error') retry()
  }, [session?.status])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (view === 'settings') closeSettings()
        else hide()
      } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        if (canCopy && !event.repeat) void copy()
      } else if (event.ctrlKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        if (canRetry) retry()
      } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        toggleListen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, canCopy, canRetry, copy, closeSettings, toggleListen])

  return (
    // The padding leaves transparent room for the card's shadow inside the frameless window.
    <div className="h-full px-4 pb-5 pt-3">
      <main
        // Replays the entrance animation for each new session.
        key={session?.id}
        className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-float motion-safe:animate-pop-in"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(99,102,241,0.16),transparent)]" />
        <TitleBar
          badge={view === 'settings' ? <Badge>Configurações</Badge> : statusBadge(session)}
          actions={
            view === 'main' && (
              <IconButton label="Configurações" onClick={() => setView('settings')}>
                <SlidersIcon />
              </IconButton>
            )
          }
          onClose={hide}
        />
        {view === 'settings' ? (
          <SettingsView onClose={closeSettings} />
        ) : session?.source ? (
          <>
            <ResultView session={session} onOpenSettings={() => setView('settings')} onRetry={retry} />
            <Footer
              canCopy={canCopy}
              copied={copied}
              onCopy={copy}
              onRetry={canRetry ? retry : undefined}
              onListen={speech.available ? toggleListen : undefined}
              listening={speech.speaking}
            />
          </>
        ) : (
          <EmptyState clipboardEmpty={session !== null} shortcut={formatAccelerator(assistShortcut)} />
        )}
      </main>
    </div>
  )
}

function statusBadge(session: Session | null) {
  if (!session?.source) return null
  if (session.status === 'loading' || session.status === 'streaming') return <Badge busy>Escrevendo</Badge>
  if (session.status === 'done' && session.mode) {
    return <Badge>{session.mode === 'translated' ? 'PT → EN' : 'EN revisado'}</Badge>
  }
  return null
}
