import { useState, type ReactNode } from 'react'
import { MAX_GLOSSARY_LENGTH, type Preferences } from '../../../shared/ipc'
import { ToneSelector } from './ToneSelector'

type PreferencesPanelProps = {
  preferences: Preferences
  onChanged: () => void
}

export function PreferencesPanel({ preferences, onChanged }: PreferencesPanelProps) {
  const [glossary, setGlossary] = useState(preferences.glossary)

  const save = async (patch: Partial<Preferences>) => {
    await window.api.savePreferences(patch)
    onChanged()
  }

  return (
    <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
      <Row label="Tom padrão" description="Usado pelos atalhos. Dá para trocar em cada resultado.">
        <ToneSelector value={preferences.tone} onChange={(tone) => void save({ tone })} size="medium" />
      </Row>

      <div>
        <label htmlFor="glossary" className="text-[12.5px] font-medium text-zinc-200">
          Glossário
        </label>
        <p className="mt-0.5 text-[11.5px] leading-5 text-zinc-500">
          Um termo por linha. Só o termo: nunca é traduzido. Com sinal de igual: tradução fixa.
        </p>
        <textarea
          id="glossary"
          value={glossary}
          onChange={(event) => setGlossary(event.target.value)}
          // Saved when the field loses focus rather than on every key press.
          onBlur={() => glossary !== preferences.glossary && void save({ glossary })}
          maxLength={MAX_GLOSSARY_LENGTH}
          rows={4}
          spellCheck={false}
          placeholder={'Kubernetes\nnota fiscal = invoice\nfechamento = month-end closing'}
          className="scroll-thin mt-1.5 w-full select-text resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[12.5px] leading-5 text-zinc-100 transition-colors placeholder:text-zinc-600 hover:border-white/20 focus:border-indigo-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/25"
        />
      </div>
    </div>
  )
}

type RowProps = {
  label: string
  description: string
  children: ReactNode
}

export function Row({ label, description, children }: RowProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-zinc-200">{label}</p>
        <p className="mt-0.5 text-[11.5px] leading-5 text-zinc-500">{description}</p>
      </div>
      {children}
    </div>
  )
}
