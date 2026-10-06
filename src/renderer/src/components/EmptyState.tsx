import { ClipboardIcon } from './icons'
import { Kbd } from './Kbd'

// `clipboardEmpty` is the shortcut pressed with no text selected or copied.
type EmptyStateProps = {
  clipboardEmpty?: boolean
  /** Key names of the shortcut that starts a translation. */
  shortcut: string[]
}

export function EmptyState({ clipboardEmpty = false, shortcut }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-indigo-300">
        <ClipboardIcon width="26" height="26" strokeWidth="1.5" />
      </div>
      <div className="space-y-2">
        {clipboardEmpty && <p className="text-[12.5px] font-medium text-amber-300">Não encontrei texto selecionado nem copiado.</p>}
        <p className="flex items-center justify-center gap-1.5 text-[14px] font-medium text-zinc-100">
          Selecione um texto e pressione
          <span className="flex items-center gap-1">
            {shortcut.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </span>
        </p>
        <p className="text-[12.5px] leading-5 text-zinc-400">
          Português vira inglês nativo e profissional.
          <br />
          Inglês ganha correção gramatical e um tom mais natural.
        </p>
      </div>
    </div>
  )
}
