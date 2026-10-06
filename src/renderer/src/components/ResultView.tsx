import type { ReactNode } from 'react'

type ResultViewProps = {
  source: string
  result: string
  status: 'loading' | 'streaming' | 'done'
}

export function ResultView({ source, result, status }: ResultViewProps) {
  return (
    <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
      <section>
        <Label>Original</Label>
        <p className="scroll-thin mt-1.5 max-h-[4.5rem] select-text overflow-y-auto whitespace-pre-wrap break-words text-[13px] leading-6 text-zinc-400">
          {source}
        </p>
      </section>

      <div className="my-4 h-px bg-white/[0.06]" />

      <section aria-live="polite" aria-busy={status !== 'done'}>
        <Label accent>Inglês</Label>
        {status === 'loading' ? (
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
