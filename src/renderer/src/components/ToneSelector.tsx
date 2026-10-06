import { TONES, type Tone } from '../../../shared/ipc'

type ToneSelectorProps = {
  value: Tone
  onChange: (tone: Tone) => void
  disabled?: boolean
  size?: 'small' | 'medium'
}

export function ToneSelector({ value, onChange, disabled = false, size = 'small' }: ToneSelectorProps) {
  const dimensions = size === 'small' ? 'h-6 px-2 text-[11px]' : 'h-7 px-3 text-[12px]'

  return (
    <div className="flex shrink-0 gap-0.5 rounded-lg bg-white/[0.04] p-0.5" role="radiogroup" aria-label="Tom do texto">
      {TONES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          onClick={() => id !== value && onChange(id)}
          className={`rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${dimensions} ${
            value === id ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
