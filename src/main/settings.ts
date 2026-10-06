import { app, safeStorage } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULT_MODEL, type PublicSettings, type SaveResult, type SettingsPatch } from '../shared/ipc'

type StoredSettings = {
  /** Base64 of the key encrypted with safeStorage (DPAPI on Windows). */
  apiKey?: string
  model?: string
}

const settingsFile = (): string => join(app.getPath('userData'), 'settings.json')

function read(): StoredSettings {
  try {
    return JSON.parse(readFileSync(settingsFile(), 'utf8'))
  } catch {
    return {}
  }
}

function write(settings: StoredSettings): void {
  mkdirSync(dirname(settingsFile()), { recursive: true })
  writeFileSync(settingsFile(), JSON.stringify(settings, null, 2))
}

function storedApiKey(): string | null {
  const { apiKey } = read()
  if (!apiKey || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(apiKey, 'base64'))
  } catch {
    return null
  }
}

// The key saved in the app wins over the OPENAI_API_KEY environment variable.
export function getApiKey(): string | null {
  return storedApiKey() ?? (process.env.OPENAI_API_KEY?.trim() || null)
}

export function getModel(): string {
  return read().model || process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
}

export function getPublicSettings(): PublicSettings {
  const stored = storedApiKey()
  const key = stored ?? getApiKey()
  return {
    hasApiKey: key !== null,
    keySource: stored ? 'app' : key ? 'env' : null,
    keyHint: key ? key.slice(-4) : null,
    model: getModel()
  }
}

export function saveSettings(patch: SettingsPatch): SaveResult {
  const next = read()

  if (patch.apiKey) {
    if (!safeStorage.isEncryptionAvailable()) {
      return {
        ok: false,
        message: 'Não foi possível criptografar a chave neste computador. Use a variável de ambiente OPENAI_API_KEY.'
      }
    }
    next.apiKey = safeStorage.encryptString(patch.apiKey).toString('base64')
  }

  if (patch.model !== undefined) {
    if (patch.model) next.model = patch.model
    else delete next.model
  }

  write(next)
  return { ok: true }
}

export function clearApiKey(): void {
  const next = read()
  delete next.apiKey
  write(next)
}
