import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { ProviderState, PublicSettings } from '../../../shared/ipc'
import { getPreset, type ProviderId } from '../../../shared/providers'
import { Button, IconButton } from './Button'
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, EyeIcon, EyeOffIcon } from './icons'
import { ShortcutsPanel } from './ShortcutsPanel'

const INPUT =
  'h-9 w-full select-text rounded-lg border border-white/10 bg-white/[0.04] px-3 font-mono text-[13px] text-zinc-100 placeholder:text-zinc-600 transition-colors hover:border-white/20 focus:border-indigo-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-400/25'

const FOOTER = 'flex h-[52px] shrink-0 items-center justify-end gap-1.5 border-t border-white/[0.06] px-3'

const TABS = [
  { id: 'providers', label: 'Provedores' },
  { id: 'shortcuts', label: 'Atalhos' }
] as const

type Tab = (typeof TABS)[number]['id']

export function SettingsView({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [tab, setTab] = useState<Tab>('providers')
  const [editing, setEditing] = useState<ProviderId | null>(null)

  const load = useCallback(async () => {
    setSettings(await window.api.getSettings())
  }, [])

  useEffect(() => {
    // Stay open while the user switches to the browser to copy a key.
    void window.api.setAutoHide(false)
    void load()
    return () => {
      void window.api.setAutoHide(true)
    }
  }, [load])

  const move = async (id: ProviderId, direction: -1 | 1) => {
    await window.api.moveProvider(id, direction)
    await load()
  }

  const providers = settings?.providers ?? []
  const current = providers.find((state) => state.id === editing)
  if (current) {
    const backToList = async () => {
      await load()
      setEditing(null)
    }
    return <ProviderForm key={current.id} state={current} onBack={() => setEditing(null)} onChanged={backToList} />
  }

  const activeCount = providers.filter((state) => state.active).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {tab === 'shortcuts' && settings ? (
        <ShortcutsPanel shortcuts={settings.shortcuts} onChanged={() => void load()} />
      ) : (
        <div className="scroll-thin flex-1 overflow-y-auto px-3 py-3">
          <p className="px-2 pb-2 text-[12px] leading-5 text-zinc-400">
            O primeiro provedor ativo responde. Se ele falhar ou atingir o limite, o próximo assume automaticamente.
          </p>
          <ul className="space-y-0.5">
            {providers.map((state, index) => (
              <ProviderRow
                key={state.id}
                state={state}
                position={index + 1}
                canMoveUp={state.active && index > 0}
                canMoveDown={state.active && index < activeCount - 1}
                showOrder={activeCount > 1}
                onEdit={() => setEditing(state.id)}
                onMove={(direction) => void move(state.id, direction)}
              />
            ))}
          </ul>
        </div>
      )}
      <footer className={FOOTER}>
        <div className="mr-auto flex gap-0.5 rounded-lg bg-white/[0.04] p-0.5" role="tablist">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`h-7 rounded-md px-3 text-[12px] font-medium transition-colors ${
                tab === id ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={onClose}>Voltar</Button>
      </footer>
    </div>
  )
}

type ProviderRowProps = {
  state: ProviderState
  position: number
  canMoveUp: boolean
  canMoveDown: boolean
  showOrder: boolean
  onEdit: () => void
  onMove: (direction: -1 | 1) => void
}

function ProviderRow({ state, position, canMoveUp, canMoveDown, showOrder, onEdit, onMove }: ProviderRowProps) {
  const preset = getPreset(state.id)

  return (
    <li className="flex h-10 items-center gap-1 rounded-xl pl-2 pr-1 transition-colors hover:bg-white/[0.04]">
      <button type="button" onClick={onEdit} className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left">
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold ${
            state.active ? 'bg-indigo-400/20 text-indigo-200' : 'border border-dashed border-white/15'
          }`}
        >
          {state.active && position}
        </span>
        <span className={`shrink-0 text-[13px] font-medium ${state.active ? 'text-zinc-100' : 'text-zinc-400'}`}>
          {preset.name}
        </span>
        {preset.free && <FreeTag />}
        <span className="ml-auto truncate pl-2 font-mono text-[11.5px] text-zinc-500">
          {state.active ? state.model : 'Não configurado'}
        </span>
      </button>
      {showOrder && state.active && (
        <>
          <IconButton label="Subir na ordem" disabled={!canMoveUp} onClick={() => onMove(-1)}>
            <ChevronUpIcon width="14" height="14" />
          </IconButton>
          <IconButton label="Descer na ordem" disabled={!canMoveDown} onClick={() => onMove(1)}>
            <ChevronDownIcon width="14" height="14" />
          </IconButton>
        </>
      )}
      <ChevronRightIcon width="14" height="14" className="mx-1 shrink-0 text-zinc-600" />
    </li>
  )
}

function FreeTag() {
  return (
    <span className="shrink-0 rounded-full bg-emerald-400/10 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300">
      Grátis
    </span>
  )
}

type ProviderFormProps = {
  state: ProviderState
  onBack: () => void
  onChanged: () => void
}

function ProviderForm({ state, onBack, onChanged }: ProviderFormProps) {
  const preset = getPreset(state.id)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(state.model)
  const [baseURL, setBaseURL] = useState(state.baseURL)
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await window.api.saveProvider({
      id: state.id,
      apiKey: apiKey.trim() || undefined,
      model: model.trim(),
      baseURL: preset.customBaseURL ? baseURL.trim() : undefined
    })
    if (result.ok) onChanged()
    else setError(result.message)
  }

  const remove = async () => {
    await window.api.removeProvider(state.id)
    onChanged()
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-zinc-100">
            {preset.name}
            {preset.free && <FreeTag />}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-zinc-400">{preset.note}</p>
        </div>

        {preset.key !== 'none' && (
          <Field
            label={preset.key === 'optional' ? 'Chave de API (opcional)' : 'Chave de API'}
            htmlFor="api-key"
            status={<KeyStatus state={state} />}
            help={
              <>
                Fica criptografada neste computador e só é enviada a este provedor.
                {preset.keyUrl && (
                  <>
                    {' '}
                    <a
                      href={preset.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded text-indigo-300 underline-offset-2 hover:underline"
                    >
                      Criar uma chave ↗
                    </a>
                  </>
                )}
              </>
            }
          >
            <div className="relative">
              <input
                id="api-key"
                type={reveal ? 'text' : 'password'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={state.keySource === 'app' ? 'Cole uma nova chave para substituir' : 'Cole a chave aqui'}
                autoComplete="off"
                spellCheck={false}
                autoFocus
                className={`${INPUT} pr-10`}
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
        )}

        {preset.customBaseURL && (
          <Field label="URL base" htmlFor="base-url">
            <input
              id="base-url"
              value={baseURL}
              onChange={(event) => setBaseURL(event.target.value)}
              placeholder={preset.baseURL || 'https://api.exemplo.com/v1'}
              autoComplete="off"
              spellCheck={false}
              className={INPUT}
            />
          </Field>
        )}

        <Field label="Modelo" htmlFor="model">
          <input
            id="model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={preset.defaultModel || 'ID do modelo'}
            autoComplete="off"
            spellCheck={false}
            className={INPUT}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-[12.5px] leading-5 text-rose-100">
            {error}
          </p>
        )}
      </div>

      <footer className={FOOTER}>
        {(state.active || state.keySource === 'app') && (
          <Button onClick={remove} className="mr-auto !text-rose-300 hover:!bg-rose-400/10">
            Remover
          </Button>
        )}
        <Button onClick={onBack}>Voltar</Button>
        <Button type="submit" variant="primary">
          {state.active ? 'Salvar' : 'Ativar'}
        </Button>
      </footer>
    </form>
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  status?: ReactNode
  help?: ReactNode
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
      {help && <p className="mt-1.5 text-[11.5px] leading-5 text-zinc-500">{help}</p>}
    </div>
  )
}

function KeyStatus({ state }: { state: ProviderState }) {
  if (!state.keySource) return null
  return (
    <span className="flex items-center gap-2 text-[11.5px] text-zinc-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {state.keySource === 'env' ? 'Usando variável de ambiente' : `Chave salva ···· ${state.keyHint}`}
    </span>
  )
}
