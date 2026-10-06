import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { DEFAULT_MODEL, type PublicSettings } from '../../../shared/ipc'
import { Button } from './Button'
import { EyeIcon, EyeOffIcon } from './icons'

type SettingsViewProps = {
  onClose: () => void
  onSaved: () => void
}

const INPUT =
  'h-9 w-full select-text rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] text-zinc-100 placeholder:text-zinc-600 transition-colors hover:border-white/20 focus:border-indigo-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/25'

export function SettingsView({ onClose, onSaved }: SettingsViewProps) {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const next = await window.api.getSettings()
    setSettings(next)
    setModel(next.model)
  }, [])

  useEffect(() => {
    // Stay open while the user switches to the browser to copy the key.
    void window.api.setAutoHide(false)
    void load()
    return () => {
      void window.api.setAutoHide(true)
    }
  }, [load])

  const modelChanged = settings !== null && model.trim() !== settings.model
  const dirty = apiKey.trim() !== '' || modelChanged

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!dirty) return onClose()
    const result = await window.api.saveSettings({
      apiKey: apiKey.trim() || undefined,
      // Untouched, the model keeps following OPENAI_MODEL and the app default.
      model: modelChanged ? model.trim() : undefined
    })
    if (result.ok) onSaved()
    else setError(result.message)
  }

  const removeKey = async () => {
    await window.api.clearApiKey()
    await load()
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-thin flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <Field
          label="Chave de API da OpenAI"
          htmlFor="api-key"
          status={settings && <KeyStatus settings={settings} onRemove={removeKey} />}
          help={
            <>
              Fica criptografada neste computador e só é enviada à OpenAI.{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="rounded text-indigo-300 underline-offset-2 hover:underline"
              >
                Criar uma chave ↗
              </a>
            </>
          }
        >
          <div className="relative">
            <input
              id="api-key"
              type={reveal ? 'text' : 'password'}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={settings?.keySource === 'app' ? 'Cole uma nova chave para substituir' : 'sk-…'}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className={`${INPUT} pr-10 font-mono`}
            />
            <button
              type="button"
              onClick={() => setReveal((value) => !value)}
              title={reveal ? 'Ocultar chave' : 'Mostrar chave'}
              aria-label={reveal ? 'Ocultar chave' : 'Mostrar chave'}
              className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md text-zinc-500 hover:text-zinc-200"
            >
              {reveal ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        <Field label="Modelo" htmlFor="model" help={`Qualquer modelo de chat da OpenAI. Padrão: ${DEFAULT_MODEL}.`}>
          <input
            id="model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={DEFAULT_MODEL}
            autoComplete="off"
            spellCheck={false}
            className={`${INPUT} font-mono`}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-[12.5px] leading-5 text-rose-100">
            {error}
          </p>
        )}
      </div>

      <footer className="flex h-[52px] shrink-0 items-center justify-end gap-1.5 border-t border-white/[0.06] px-3">
        <Button onClick={onClose}>Voltar</Button>
        <Button type="submit" variant="primary" disabled={!dirty}>
          Salvar
        </Button>
      </footer>
    </form>
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  status?: ReactNode
  help: ReactNode
  children: ReactNode
}

function Field({ label, htmlFor, status, help, children }: FieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[12.5px] font-medium text-zinc-200">
          {label}
        </label>
        {status}
      </div>
      {children}
      <p className="mt-1.5 text-[11.5px] leading-5 text-zinc-500">{help}</p>
    </div>
  )
}

function KeyStatus({ settings, onRemove }: { settings: PublicSettings; onRemove: () => void }) {
  if (!settings.hasApiKey) {
    return <span className="text-[11.5px] font-medium text-amber-300">Nenhuma chave configurada</span>
  }
  return (
    <span className="flex items-center gap-2 text-[11.5px] text-zinc-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {settings.keySource === 'env' ? 'Usando OPENAI_API_KEY do ambiente' : `Chave salva ···· ${settings.keyHint}`}
      {settings.keySource === 'app' && (
        <button type="button" onClick={onRemove} className="rounded font-medium text-rose-300 hover:underline">
          Remover
        </button>
      )}
    </span>
  )
}
