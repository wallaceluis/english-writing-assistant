import type { Session } from '../hooks/useAssistant'
import { Button, IconButton } from './Button'
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
  /** Types the result over the selection of the application behind the window. */
  onReplace?: () => void
}

export function Footer({ provider, canCopy, copied, onCopy, onRetry, onListen, listening, onReplace }: FooterProps) {
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

      <div className="flex shrink-0 items-center gap-1">
        {onListen && (
          <IconButton
            label={listening ? 'Parar (Ctrl+L)' : 'Ouvir (Ctrl+L)'}
            onClick={onListen}
            disabled={!canCopy}
            className={`!h-8 !w-8 ${listening ? '!text-indigo-300' : ''}`}
          >
            {listening ? <StopIcon /> : <SpeakerIcon />}
          </IconButton>
        )}
        {onRetry && (
          <IconButton label="Refazer (Ctrl+R)" onClick={onRetry} className="!h-8 !w-8">
            <RefreshIcon />
          </IconButton>
        )}
        {onReplace && (
          <Button onClick={onReplace} disabled={!canCopy} title="Colar por cima do texto selecionado (Ctrl+Enter)" className="ml-1">
            Substituir
          </Button>
        )}
        {copied ? (
          <Button variant="success" disabled className="ml-0.5 !opacity-100">
            <CheckIcon width="14" height="14" /> Copiado
          </Button>
        ) : (
          <Button variant="primary" onClick={onCopy} disabled={!canCopy} className="ml-0.5">
            <CopyIcon width="14" height="14" /> Copiar
          </Button>
        )}
      </div>
    </footer>
  )
}
