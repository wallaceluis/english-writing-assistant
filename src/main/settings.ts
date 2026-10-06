import { app, safeStorage } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  MAX_GLOSSARY_LENGTH,
  TONES,
  type Preferences,
  type ProviderPatch,
  type ProviderState,
  type PublicSettings,
  type SaveResult
} from '../shared/ipc'
import { getPreset, isProviderId, PROVIDERS, type ProviderId } from '../shared/providers'
import { DEFAULT_SHORTCUTS, type ShortcutAction, type Shortcuts } from '../shared/shortcuts'

type StoredProvider = {
  /** Base64 of the key encrypted with safeStorage (DPAPI on Windows). */
  apiKey?: string
  model?: string
  baseURL?: string
  /** Activates providers that work without a key. */
  enabled?: boolean
}

type StoredSettings = {
  providers?: Partial<Record<ProviderId, StoredProvider>>
  /** Fallback order. */
  order?: ProviderId[]
  /** Only the shortcuts changed by the user. */
  shortcuts?: Partial<Shortcuts>
  preferences?: Partial<Preferences>
}

const DEFAULT_PREFERENCES: Preferences = { tone: 'professional', glossary: '', history: true, voice: 'system' }

export type ResolvedProvider = {
  id: ProviderId
  name: string
  apiKey: string | null
  baseURL: string
  model: string
}

const settingsFile = (): string => join(app.getPath('userData'), 'settings.json')

function read(): StoredSettings {
  try {
    const parsed: unknown = JSON.parse(readFileSync(settingsFile(), 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(settings: StoredSettings): void {
  mkdirSync(dirname(settingsFile()), { recursive: true })
  writeFileSync(settingsFile(), JSON.stringify(settings, null, 2))
}

function decrypt(value: string | undefined): string | null {
  if (!value || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return null
  }
}

// A key saved in the app wins over the provider's environment variable.
function resolve(id: ProviderId, settings: StoredSettings): ProviderState & { apiKey: string | null } {
  const preset = getPreset(id)
  const stored = settings.providers?.[id] ?? {}
  const savedKey = decrypt(stored.apiKey)
  const envKey = (preset.envKey && process.env[preset.envKey]?.trim()) || null
  const apiKey = savedKey ?? envKey
  const model = stored.model || (id === 'openai' && process.env.OPENAI_MODEL?.trim()) || preset.defaultModel
  const baseURL = (preset.customBaseURL && stored.baseURL) || preset.baseURL
  const active =
    preset.key === 'required' ? apiKey !== null : stored.enabled === true && baseURL !== '' && model !== ''

  return {
    id,
    active,
    keySource: savedKey ? 'app' : envKey ? 'env' : null,
    keyHint: apiKey ? apiKey.slice(-4) : null,
    model,
    baseURL,
    apiKey
  }
}

// Saved order first, then any provider it does not mention; active ones always ahead.
function resolveAll(settings: StoredSettings): Array<ProviderState & { apiKey: string | null }> {
  const saved = [...new Set((settings.order ?? []).filter(isProviderId))]
  const ids = [...saved, ...PROVIDERS.map((preset) => preset.id).filter((id) => !saved.includes(id))]
  const states = ids.map((id) => resolve(id, settings))
  return [...states.filter((state) => state.active), ...states.filter((state) => !state.active)]
}

/** The fallback chain, in the order the providers should be tried. */
export function getActiveProviders(): ResolvedProvider[] {
  return resolveAll(read())
    .filter((state) => state.active)
    .map(({ id, apiKey, baseURL, model }) => ({ id, name: getPreset(id).name, apiKey, baseURL, model }))
}

export function getShortcuts(): Shortcuts {
  return { ...DEFAULT_SHORTCUTS, ...read().shortcuts }
}

export function saveShortcut(action: ShortcutAction, accelerator: string): void {
  const settings = read()
  write({ ...settings, shortcuts: { ...settings.shortcuts, [action]: accelerator } })
}

export function getPreferences(): Preferences {
  return { ...DEFAULT_PREFERENCES, ...read().preferences }
}

// Values come from the renderer, so anything unexpected is dropped rather than stored.
export function savePreferences(patch: Partial<Record<keyof Preferences, unknown>>): void {
  const settings = read()
  const next: Partial<Preferences> = { ...settings.preferences }
  const tone = TONES.find((candidate) => candidate.id === patch.tone)
  if (tone) next.tone = tone.id
  if (typeof patch.glossary === 'string') next.glossary = patch.glossary.slice(0, MAX_GLOSSARY_LENGTH)
  if (typeof patch.history === 'boolean') next.history = patch.history
  if (patch.voice === 'system' || patch.voice === 'gemini') next.voice = patch.voice
  write({ ...settings, preferences: next })
}

export function getGeminiKey(): string | null {
  return resolve('gemini', read()).apiKey
}

export function getPublicSettings(): PublicSettings {
  return {
    providers: resolveAll(read()).map(({ apiKey: _apiKey, ...state }) => state),
    shortcuts: getShortcuts(),
    preferences: getPreferences(),
    geminiKey: getGeminiKey() !== null
  }
}

// Keys must not travel in clear text, except to a server on this machine.
function isSafeBaseURL(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  } catch {
    return false
  }
}

export function saveProvider(patch: ProviderPatch): SaveResult {
  const preset = getPreset(patch.id)
  const settings = read()
  const stored: StoredProvider = { ...settings.providers?.[patch.id] }

  if (patch.apiKey) {
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, message: 'Não foi possível criptografar a chave neste computador.' }
    }
    stored.apiKey = safeStorage.encryptString(patch.apiKey).toString('base64')
  } else if (preset.key === 'required' && resolve(patch.id, settings).apiKey === null) {
    return { ok: false, message: 'Informe a chave de API.' }
  }

  if (preset.customBaseURL) {
    const baseURL = patch.baseURL || preset.baseURL
    if (!isSafeBaseURL(baseURL)) {
      return { ok: false, message: 'Informe uma URL base https:// (http:// só é aceito para localhost).' }
    }
    stored.baseURL = baseURL === preset.baseURL ? undefined : baseURL
  }

  const model = patch.model || preset.defaultModel
  if (!model) return { ok: false, message: 'Informe o modelo.' }
  // Left at the default, the model keeps following the preset and OPENAI_MODEL.
  stored.model = model === preset.defaultModel ? undefined : model
  stored.enabled = true

  write({ ...settings, providers: { ...settings.providers, [patch.id]: stored } })
  return { ok: true }
}

export function removeProvider(id: ProviderId): void {
  const settings = read()
  const providers = { ...settings.providers }
  delete providers[id]
  write({ ...settings, providers })
}

export function moveProvider(id: ProviderId, direction: -1 | 1): void {
  const settings = read()
  const states = resolveAll(settings)
  const active = states.filter((state) => state.active).map((state) => state.id)
  const from = active.indexOf(id)
  const to = from + direction
  if (from === -1 || to < 0 || to >= active.length) return

  ;[active[from], active[to]] = [active[to], active[from]]
  const inactive = states.filter((state) => !state.active).map((state) => state.id)
  write({ ...settings, order: [...active, ...inactive] })
}
