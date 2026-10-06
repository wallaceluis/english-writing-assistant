import { useState } from 'react'
import type { ExplainResult } from '../../../shared/ipc'

type ExplanationProps = {
  source: string
  result: string
}

// For texts that were already in English: what the correction changed, and why.
export function Explanation({ source, result }: ExplanationProps) {
  const [state, setState] = useState<'idle' | 'loading' | ExplainResult>('idle')

  const explain = async () => {
    setState('loading')
    setState(await window.api.explain(source, result))
  }

  if (state === 'idle' || state === 'loading') {
    return (
      <button
        type="button"
        onClick={explain}
        disabled={state === 'loading'}
        className="mt-3 rounded text-[12px] font-medium text-indigo-300 underline-offset-2 hover:underline disabled:pointer-events-none disabled:text-zinc-500"
      >
        {state === 'loading' ? 'Analisando as correções…' : 'Explicar as correções'}
      </button>
    )
  }

  if (!state.ok) {
    return (
      <p role="alert" className="mt-3 text-[12px] leading-5 text-rose-300">
        {state.message}
      </p>
    )
  }

  // The model answers with one "- ..." line per change.
  const lines = state.text
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)

  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-500">O que mudou</h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] leading-5 text-zinc-300 marker:text-zinc-600">
        {lines.map((line, index) => (
          <li key={index} className="select-text">
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}
