import type { SpeechResult } from '../shared/ipc'
import { getGeminiKey } from './settings'

// Optional natural voice through Gemini's speech models, with the same key as the Gemini provider.
// https://ai.google.dev/gemini-api/docs/speech-generation
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const MODEL = 'gemini-3.8-flash-tts'
const VOICE = 'Kore'
const MAX_CHARACTERS = 4_000
const REQUEST_TIMEOUT_MS = 30_000

type Audio = { data: string; mimeType: string }

// The audio part sits a few levels deep in the answer; searching for it survives small changes of shape.
function findAudio(node: unknown): Audio | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findAudio(item)
      if (found) return found
    }
    return null
  }

  const record = node as Record<string, unknown>
  const mimeType = record.mime_type ?? record.mimeType
  if (typeof record.data === 'string' && record.data.length > 100) {
    return { data: record.data, mimeType: typeof mimeType === 'string' ? mimeType : 'audio/wav' }
  }
  return findAudio(Object.values(record))
}

function describeFailure(status: number, body: unknown): string {
  if (status === 400 || status === 401 || status === 403) return 'O Gemini recusou a chave de API para gerar a voz.'
  if (status === 429) return 'O limite gratuito de voz do Gemini foi atingido.'
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message
  return typeof message === 'string' ? `O Gemini retornou um erro: ${message}` : `O Gemini retornou o erro ${status}.`
}

export async function synthesize(text: string): Promise<SpeechResult> {
  const apiKey = getGeminiKey()
  if (!apiKey) return { ok: false, message: 'Ative o Google Gemini em Provedores para usar a voz natural.' }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model: MODEL,
        input: [{ type: 'user_input', content: [{ type: 'text', text: text.slice(0, MAX_CHARACTERS) }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: VOICE }] }
      })
    })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) return { ok: false, message: describeFailure(response.status, body) }

    const audio = findAudio(body)
    return audio ? { ok: true, ...audio } : { ok: false, message: 'O Gemini não retornou áudio.' }
  } catch {
    return { ok: false, message: 'Não foi possível conectar ao Gemini para gerar a voz.' }
  }
}
