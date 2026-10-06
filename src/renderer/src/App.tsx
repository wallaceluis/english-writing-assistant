import { useCallback, useEffect, useState } from 'react'
import { Footer } from './components/Footer'
import { ResultView } from './components/ResultView'
import { Badge, TitleBar } from './components/TitleBar'

// Static sample until the clipboard and the OpenAI integration are wired in.
const PREVIEW = {
  source: 'Oi pessoal, consegui terminar a revisão do PR. Deixei alguns comentários, me avisem se tiverem dúvidas.',
  result: "Hi everyone, I've finished reviewing the PR. I left a few comments — let me know if you have any questions."
}

export default function App() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(PREVIEW.result)
    setCopied(true)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    // The padding leaves transparent room for the card's shadow inside the frameless window.
    <div className="h-full px-4 pb-5 pt-3">
      <main className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-float motion-safe:animate-pop-in">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(99,102,241,0.16),transparent)]" />
        <TitleBar badge={<Badge>PT → EN</Badge>} onClose={() => window.close()} />
        <ResultView source={PREVIEW.source} result={PREVIEW.result} status="done" />
        <Footer canCopy copied={copied} onCopy={copy} />
      </main>
    </div>
  )
}
