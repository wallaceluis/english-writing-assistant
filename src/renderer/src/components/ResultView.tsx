import type { ReactNode } from 'react'
import type { Session } from '../hooks/useAssistant'
import { Button } from './Button'
import { AlertIcon, KeyIcon } from './icons'

type ResultViewProps = {
  session: Session
  onOpenSettings: () => void
  onRetry: () => void
}

export function ResultView({ session, onOpenSettings, onRetry }: ResultViewProps) {
  const { source, result, status, provider } = session

  return (
    <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
      <section>
        <Label>Original</Label>
        <p className="scroll-thin mt-1.5 max-h-[4.5rem] select-text overflow-y-auto whitespace-pre-wrap break-words text-[13px] leading-6 text-zinc-400">
          {source}
        </p>
      </section>

      <div className="my-4 h-px bg-white/[0.06]" />

      <section aria-live="polite" aria-busy={status === 'loading' || status === 'streaming'}>
        <div className="flex items-baseline justify-between gap-3">
          <Label accent>Inglês</Label>
          {provider && status !== 'error' && (
            <span className="truncate text-[11px] text-zinc-500" title={provider.model}>
              {provider.fallback && <span className="text-amber-300/80">fallback · </span>}
              via {provider.name}
            </span>
          )}
        </div>
        {status === 'error' ? (
          <ErrorCard session={session} onOpenSettings={onOpenSettings} onRetry={onRetry} />
        ) : status === 'loading' ? (
          <Skeleton />
        ) : (
          <p className="mt-1.5 select-text whitespace-pre-wrap break-words text-[15px] leading-7 text-zinc-50">
            {result}
            {status === 'streaming' && (
              <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] rounded-full bg-indigo-300 motion-safe:animate-blink" />
            )}
          </p>
        )}
      </section>
    </div>
  )
}

function Label({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <h2 className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${accent ? 'text-indigo-300' : 'text-zinc-500'}`}>
      {children}
    </h2>
  )
}

function Skeleton() {
  return (
    <div className="mt-3 space-y-2.5" role="status" aria-label="Escrevendo">
      {['w-11/12', 'w-full', 'w-7/12'].map((width) => (
        <div key={width} className={`relative h-3.5 overflow-hidden rounded-full bg-white/[0.06] ${width}`}>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent motion-safe:animate-shimmer" />
        </div>
      ))}
    </div>
  )
}

function ErrorCard({ session, onOpenSettings, onRetry }: ResultViewProps) {
  const code = session.error?.code
  const needsSetup = code === 'missing-key'
  const fixInSettings = needsSetup || code === 'invalid-key' || code === 'model'
  const tone = needsSetup
    ? { card: 'border-amber-300/20 bg-amber-300/[0.06]', icon: 'text-amber-300', text: 'text-amber-50' }
    : { card: 'border-rose-400/20 bg-rose-400/[0.07]', icon: 'text-rose-300', text: 'text-rose-50' }

  return (
    <div role="alert" className={`mt-2.5 flex items-start gap-3 rounded-xl border p-3.5 ${tone.card}`}>
      <span className={`mt-0.5 shrink-0 ${tone.icon}`}>{needsSetup ? <KeyIcon /> : <AlertIcon />}</span>
      <div className="min-w-0">
        <p className={`select-text break-words text-[13px] leading-5 ${tone.text}`}>{session.error?.message}</p>
        {code !== 'too-long' && (
          <Button
            className="mt-3 border border-white/10 bg-white/[0.06] !text-zinc-100 hover:bg-white/[0.1]"
            onClick={fixInSettings ? onOpenSettings : onRetry}
          >
            {needsSetup ? 'Configurar provedor' : fixInSettings ? 'Abrir configurações' : 'Tentar de novo'}
          </Button>
        )}
      </div>
    </div>
  )
}
