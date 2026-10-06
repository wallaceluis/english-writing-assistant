import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicSettings, Tone, View } from '../../shared/ipc'
import { DEFAULT_SHORTCUTS, formatAccelerator } from '../../shared/shortcuts'
import { IconButton } from './components/Button'
import { EmptyState } from './components/EmptyState'
import { Footer } from './components/Footer'
import { HistoryView } from './components/HistoryView'
import { ClockIcon, SlidersIcon } from './components/icons'
import { ResultView } from './components/ResultView'
import { SettingsView } from './components/SettingsView'
import { Badge, TitleBar } from './components/TitleBar'
import { useAssistant, type Session } from './hooks/useAssistant'
import { useSpeech } from './hooks/useSpeech'

// Long enough to see the "Copiado" confirmation before the window goes away.
const HIDE_AFTER_COPY_MS = 450

const hide = (): void => void window.api.hide()

export default function App() {
  const { session, restore } = useAssistant()
  const [view, setView] = useState<View>('main')
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const hideTimer = useRef<number>()
  const spokenFor = useRef<number>()
  const speech = useSpeech(settings?.preferences.voice ?? 'system')

  // Reloaded whenever the settings screen closes, where shortcuts and preferences can change.
  useEffect(() => {
    if (view === 'main') void window.api.getSettings().then(setSettings)
  }, [view])

  useEffect(() => window.api.onNavigate(setView), [])

  // A new session always takes over the window.
  useEffect(() => {
    window.clearTimeout(hideTimer.current)
    setCopied(false)
    speech.stop()
    if (session) setView('main')
  }, [session?.id, speech.stop])

  const language = session?.direction === 'to-portuguese' ? 'pt' : 'en'
  const canSpeak = speech.canSpeak(language)

  // The "translate and listen" shortcut: speak once, as soon as the text is complete.
  // Declared after the effect above, which silences the previous session.
  useEffect(() => {
    if (!session?.speak || session.status !== 'done' || !canSpeak || spokenFor.current === session.id) return
    spokenFor.current = session.id
    void speech.speak(session.result, language)
  }, [session, canSpeak, language, speech.speak])

  const result = session?.status === 'done' ? session.result : ''
  const canCopy = view === 'main' && result !== ''
  const canRetry =
    view === 'main' &&
    (session?.status === 'done' || (session?.status === 'error' && session.error?.code !== 'missing-key'))

  // Same text again: a retry, or another tone.
  const rerun = useCallback(
    (tone?: Tone) => {
      if (!session) return
      void window.api.run({ source: session.source, direction: session.direction, tone: tone ?? session.tone })
    },
    [session?.source, session?.direction, session?.tone]
  )

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

  // Only English goes back into the application: a Portuguese result is for reading.
  const canReplace = canCopy && session?.direction === 'to-english'
  const replace = useCallback(() => {
    if (canReplace) void window.api.replace(result)
  }, [canReplace, result])

  const toggleListen = useCallback(() => {
    if (speech.speaking) speech.stop()
    else if (canCopy) void speech.speak(result, language)
  }, [speech.speaking, speech.stop, speech.speak, canCopy, result, language])

  const closeSettings = useCallback(() => {
    setView('main')
    // The failed request was most likely waiting on a provider that has just been configured.
    if (session?.status === 'error') rerun()
  }, [session?.status, rerun])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (view === 'settings') closeSettings()
        else if (view === 'history') setView('main')
        else hide()
      } else if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault()
        replace()
      } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        if (canCopy && !event.repeat) void copy()
      } else if (event.ctrlKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        if (canRetry) rerun()
      } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        toggleListen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [view, canCopy, canRetry, copy, rerun, replace, closeSettings, toggleListen])

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
          badge={
            view === 'settings' ? <Badge>Configurações</Badge> : view === 'history' ? <Badge>Histórico</Badge> : statusBadge(session)
          }
          actions={
            view === 'main' && (
              <>
                <IconButton label="Histórico" onClick={() => setView('history')}>
                  <ClockIcon />
                </IconButton>
                <IconButton label="Configurações" onClick={() => setView('settings')}>
                  <SlidersIcon />
                </IconButton>
              </>
            )
          }
          onClose={hide}
        />
        {view === 'settings' ? (
          <SettingsView onClose={closeSettings} />
        ) : view === 'history' ? (
          <HistoryView enabled={settings?.preferences.history ?? true} onOpen={restore} onClose={() => setView('main')} />
        ) : session?.source ? (
          <>
            <ResultView
              session={session}
              onOpenSettings={() => setView('settings')}
              onRetry={() => rerun()}
              onTone={rerun}
            />
            <Footer
              provider={session.status === 'error' ? null : session.provider}
              canCopy={canCopy}
              copied={copied}
              onCopy={copy}
              onRetry={canRetry ? () => rerun() : undefined}
              onListen={canSpeak ? toggleListen : undefined}
              listening={speech.speaking}
              notice={speech.notice}
              onReplace={session.direction === 'to-english' ? replace : undefined}
            />
          </>
        ) : (
          <EmptyState
            clipboardEmpty={session !== null}
            shortcut={formatAccelerator(settings?.shortcuts.assist ?? DEFAULT_SHORTCUTS.assist)}
          />
        )}
      </main>
    </div>
  )
}

function statusBadge(session: Session | null) {
  if (!session?.source) return null
  if (session.status === 'loading' || session.status === 'streaming') return <Badge busy>Escrevendo</Badge>
  if (session.status !== 'done') return null
  if (session.direction === 'to-portuguese') return <Badge>EN → PT</Badge>
  if (session.mode) return <Badge>{session.mode === 'translated' ? 'PT → EN' : 'EN revisado'}</Badge>
  return null
}
