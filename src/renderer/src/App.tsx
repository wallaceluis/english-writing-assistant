import { useEffect } from 'react'
import { EmptyState } from './components/EmptyState'
import { Footer } from './components/Footer'
import { ResultView } from './components/ResultView'
import { TitleBar } from './components/TitleBar'
import { useAssistant } from './hooks/useAssistant'

const hide = (): void => void window.api.hide()

export default function App() {
  const session = useAssistant()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    // The padding leaves transparent room for the card's shadow inside the frameless window.
    <div className="h-full px-4 pb-5 pt-3">
      <main
        // Replays the entrance animation for each new session.
        key={session?.id}
        className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-float motion-safe:animate-pop-in"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(99,102,241,0.16),transparent)]" />
        <TitleBar onClose={hide} />
        {session?.source ? (
          <>
            <ResultView source={session.source} result="" status="pending" />
            <Footer canCopy={false} copied={false} onCopy={() => {}} />
          </>
        ) : (
          <EmptyState clipboardEmpty={session !== null} />
        )}
      </main>
    </div>
  )
}
