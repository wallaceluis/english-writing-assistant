import type { ReactNode } from 'react'
import { IconButton } from './Button'
import { CloseIcon } from './icons'
import { Logo } from './Logo'

type TitleBarProps = {
  badge?: ReactNode
  actions?: ReactNode
  onClose: () => void
}

export function TitleBar({ badge, actions, onClose }: TitleBarProps) {
  return (
    <header className="drag flex h-11 shrink-0 items-center gap-2.5 border-b border-white/[0.06] pl-3.5 pr-2">
      <Logo />
      <span className="text-[13px] font-semibold tracking-tight text-zinc-200">English Assist</span>
      {badge}
      <div className="no-drag ml-auto flex items-center gap-0.5">
        {actions}
        <IconButton label="Fechar (Esc)" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
    </header>
  )
}

export function Badge({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-indigo-200">
      {busy && <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 motion-safe:animate-pulse" />}
      {children}
    </span>
  )
}
