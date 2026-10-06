import { useCallback, useEffect, useState } from 'react'
import type { HistoryEntry } from '../../../shared/ipc'
import { Button } from './Button'

type HistoryViewProps = {
  /** False when the user turned the history off in the preferences. */
  enabled: boolean
  onOpen: (entry: HistoryEntry) => void
  onClose: () => void
}

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function HistoryView({ enabled, onOpen, onClose }: HistoryViewProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)

  const load = useCallback(async () => setEntries(await window.api.getHistory()), [])

  useEffect(() => {
    void load()
  }, [load])

  const clear = async () => {
    await window.api.clearHistory()
    await load()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {entries?.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-10 text-center text-[12.5px] leading-5 text-zinc-500">
          {enabled
            ? 'Os resultados aparecem aqui depois de cada tradução. Ficam só neste computador.'
            : 'O histórico está desligado. Ligue em Configurações → Preferências.'}
        </p>
      ) : (
        <ul className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {entries?.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-zinc-100">{entry.result}</span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-zinc-500">{entry.source}</span>
                </span>
                <span className="shrink-0 text-right text-[11px] leading-4 text-zinc-500">
                  {DATE_FORMAT.format(new Date(entry.at))}
                  <span className="block">{entry.direction === 'to-portuguese' ? 'EN → PT' : entry.mode === 'polished' ? 'EN revisado' : 'PT → EN'}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <footer className="flex h-[52px] shrink-0 items-center justify-end gap-1.5 border-t border-white/[0.06] px-3">
        {entries && entries.length > 0 && (
          <Button onClick={clear} className="mr-auto !text-rose-300 hover:!bg-rose-400/10">
            Limpar histórico
          </Button>
        )}
        <Button onClick={onClose}>Voltar</Button>
      </footer>
    </div>
  )
}
