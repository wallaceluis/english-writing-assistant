import { Button } from './Button'
import { CheckIcon, CopyIcon, RefreshIcon, SpeakerIcon, StopIcon } from './icons'
import { Kbd } from './Kbd'

type FooterProps = {
  canCopy: boolean
  copied: boolean
  onCopy: () => void
  onRetry?: () => void
  /** Absent when Windows has no English voice installed. */
  onListen?: () => void
  listening: boolean
}

export function Footer({ canCopy, copied, onCopy, onRetry, onListen, listening }: FooterProps) {
  return (
    <footer className="flex h-[52px] shrink-0 items-center justify-between border-t border-white/[0.06] pl-5 pr-3">
      <div className="flex items-center gap-4 text-[11.5px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Kbd>Enter</Kbd> copiar
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> fechar
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {onListen && (
          <Button onClick={onListen} disabled={!canCopy} title={listening ? 'Parar (Ctrl+L)' : 'Ouvir em inglês (Ctrl+L)'}>
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
