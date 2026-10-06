import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  primary:
    'bg-gradient-to-b from-indigo-400 to-indigo-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-indigo-300 hover:to-indigo-500',
  ghost: 'text-zinc-300 hover:bg-white/[0.07] hover:text-zinc-100',
  success: 'bg-emerald-500/15 text-emerald-300'
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
}

export function Button({ variant = 'ghost', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function IconButton({ label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`grid h-7 w-7 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-25 ${className}`}
      {...props}
    />
  )
}
