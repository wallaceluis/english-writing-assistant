import type { Session } from '../hooks/useAssistant'
import { Button } from './Button'
import { CheckIcon, CopyIcon, RefreshIcon, SpeakerIcon, StopIcon } from './icons'
import { Kbd } from './Kbd'

type FooterProps = {
  provider: Session['provider']
  canCopy: boolean
  copied: boolean
  onCopy: () => void
  onRetry?: () => void
  /** Absent when there is no voice for the result's language. */
  onListen?: () => void
  listening: boolean
}

export function Footer({ provider, canCopy, copied, onCopy, onRetry, onListen, listening }: FooterProps) {
  return (
    <footer className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] pl-5 pr-3">
      <div className="flex min-w-0 items-center gap-3 text-[11.5px] text-zinc-500">
        <span className="flex shrink-0 items-center gap-1.5">
          <Kbd>Enter</Kbd> copiar
        </span>
        {provider && (
          <span className="truncate" title={provider.model}>
            {provider.fallback && <span className="text-amber-300/80">fallback · </span>}
            via {provider.name}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {onListen && (
          <Button onClick={onListen} disabled={!canCopy} title={listening ? 'Parar (Ctrl+L)' : 'Ouvir (Ctrl+L)'}>
            {listening ? <StopIcon width="14" height="14" /> : <SpeakerIcon width="14" height="14" />}
            {listening ? 'Parar' : 'Ouvir'}
          </Button>
        )}
        {onRetry && (
          <Button onClick={onRetry} title="Refazer (Ctrl+R)">
            <RefreshIcon width="14" height="14" /> Refazer
          </Button>
        )}
        {copied ? (
          <Button variant="success" disabled className="!opacity-100">
            <CheckIcon width="14" height="14" /> Copiado
          </Button>
        ) : (
          <Button variant="primary" onClick={onCopy} disabled={!canCopy}>
            <CopyIcon width="14" height="14" /> Copiar
          </Button>
        )}
      </div>
    </footer>
  )
}
