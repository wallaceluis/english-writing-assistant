import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-sans text-[11px] font-medium leading-none text-zinc-300">
      {children}
    </kbd>
  )
}
