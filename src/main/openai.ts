import OpenAI from 'openai'
import type { ErrorCode, Mode, RunRequest } from '../shared/ipc'
import { buildSystemPrompt, wrapText } from './prompt'
import type { ResolvedProvider } from './settings'

const HEADER = /^\s*LANG:\s*(pt|en)\s*$/i
// A well-formed header line is far shorter than this; past it, the model skipped the header.
const HEADER_MAX_LENGTH = 24
const REQUEST_TIMEOUT_MS = 30_000

type ImproveOptions = {
  provider: ResolvedProvider
  request: RunRequest
  glossary: string
  signal: AbortSignal
  /** Automatic retries on rate limits and server errors. Zero hands over to the next provider sooner. */
  maxRetries: number
  onMode: (mode: Mode) => void
  onDelta: (delta: string) => void
}

// Streams the rewritten text through `onDelta` and resolves with the full text.
export async function improveText({ provider, request, glossary, signal, maxRetries, onMode, onDelta }: ImproveOptions): Promise<string | null> {
  const client = new OpenAI({
    // The SDK insists on a key even for local servers that ignore it.
    apiKey: provider.apiKey ?? 'not-needed',
    baseURL: provider.baseURL,
    maxRetries,
    timeout: REQUEST_TIMEOUT_MS
  })
  const stream = await client.chat.completions.create(
    {
      model: provider.model,
      stream: true,
      messages: [
        { role: 'system', content: buildSystemPrompt(request.direction, request.tone, glossary) },
        { role: 'user', content: wrapText(request.source) }
      ]
    },
    { signal }
  )

  // Only the English flow announces the source language on a first line.
  let header = ''
  let headerDone = request.direction === 'to-portuguese'
  let output = ''

  const emit = (piece: string): void => {
    // The model may leave blank lines between the header and the text.
    const delta = output ? piece : piece.trimStart()
    if (!delta) return
    output += delta
    onDelta(delta)
  }

  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content
    if (!piece) continue
    if (headerDone) {
      emit(piece)
      continue
    }

    header = (header + piece).trimStart()
    const lineEnd = header.indexOf('\n')
    if (lineEnd === -1 && header.length <= HEADER_MAX_LENGTH) continue

    headerDone = true
    const match = lineEnd === -1 ? null : HEADER.exec(header.slice(0, lineEnd))
    if (match) {
      onMode(match[1].toLowerCase() === 'pt' ? 'translated' : 'polished')
      emit(header.slice(lineEnd + 1))
    } else {
      emit(header)
    }
  }

  // Stream ended while still buffering: anything that is not a bare header is the answer itself.
  if (!headerDone && !HEADER.test(header)) emit(header)

  return output.trimEnd() || null
}

type CompleteOptions = {
  provider: ResolvedProvider
  system: string
  user: string
  signal: AbortSignal
  maxRetries: number
}

// One-shot answer, for the requests whose text is not shown while it is being written.
export async function completeText({ provider, system, user, signal, maxRetries }: CompleteOptions): Promise<string | null> {
  const client = new OpenAI({
    apiKey: provider.apiKey ?? 'not-needed',
    baseURL: provider.baseURL,
    maxRetries,
    timeout: REQUEST_TIMEOUT_MS
  })
  const completion = await client.chat.completions.create(
    {
      model: provider.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    },
    { signal }
  )
  return completion.choices[0]?.message?.content?.trim() || null
}

export function describeError(error: unknown, { name, model }: ResolvedProvider): { code: ErrorCode; message: string } {
  if (error instanceof OpenAI.APIConnectionError) {
    return { code: 'network', message: `Não foi possível conectar a ${name}. Verifique sua conexão e se o serviço está no ar.` }
  }
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return { code: 'invalid-key', message: `${name} recusou a chave de API. Confira se ela está correta e ativa.` }
    }
    if (error.status === 404 || (error.status === 403 && error.code === 'model_not_found')) {
      return { code: 'model', message: `O modelo "${model}" não existe ou não está disponível em ${name}.` }
    }
    if (error.status === 402 || (error.status === 429 && error.code === 'insufficient_quota')) {
      return { code: 'quota', message: `Sua conta em ${name} está sem créditos ou sem cota.` }
    }
    if (error.status === 429) {
      return { code: 'rate-limit', message: `${name} atingiu o limite de requisições. Aguarde um pouco e tente de novo.` }
    }
    return { code: 'unknown', message: `${name} retornou um erro: ${error.message}` }
  }
  return { code: 'unknown', message: error instanceof Error ? error.message : 'Erro inesperado.' }
}
