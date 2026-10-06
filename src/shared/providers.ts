// Every provider speaks the OpenAI Chat Completions format, so one client serves them all.

export type ProviderId = 'openai' | 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'custom'

export type ProviderPreset = {
  id: ProviderId
  name: string
  /** Empty when the user has to supply it. */
  baseURL: string
  defaultModel: string
  free: boolean
  key: 'required' | 'optional' | 'none'
  customBaseURL: boolean
  /** Where to create an API key. */
  keyUrl?: string
  /** Environment variable accepted in place of a key saved in the app. */
  envKey?: string
  /** Shown in the settings screen. Free-tier limits change often: keep them approximate. */
  note: string
}

// Listed in the default fallback order.
export const PROVIDERS: readonly ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.4-mini',
    free: false,
    key: 'required',
    customBaseURL: false,
    keyUrl: 'https://platform.openai.com/api-keys',
    envKey: 'OPENAI_API_KEY',
    note: 'Pago por uso. A assinatura do ChatGPT não inclui acesso à API.'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-3.8-flash',
    free: true,
    key: 'required',
    customBaseURL: false,
    keyUrl: 'https://aistudio.google.com/apikey',
    envKey: 'GEMINI_API_KEY',
    note: 'Grátis sem cartão. O limite varia por modelo e aparece em aistudio.google.com/rate-limit. No plano grátis, o Google pode usar os textos para melhorar seus produtos.'
  },
  {
    id: 'groq',
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    free: true,
    key: 'required',
    customBaseURL: false,
    keyUrl: 'https://console.groq.com/keys',
    envKey: 'GROQ_API_KEY',
    note: 'Grátis sem cartão: cerca de 30 requisições por minuto, 1.000 por dia e 200 mil tokens por dia em cada modelo. Respostas muito rápidas.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    free: true,
    key: 'required',
    customBaseURL: false,
    keyUrl: 'https://openrouter.ai/settings/keys',
    envKey: 'OPENROUTER_API_KEY',
    note: 'Modelos gratuitos: 20 requisições por minuto e 50 por dia (1.000 por dia depois de comprar US$ 10 em créditos). "openrouter/free" escolhe um modelo grátis disponível; também serve qualquer ID terminado em ":free".'
  },
  {
    id: 'ollama',
    name: 'Ollama (local)',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    free: true,
    key: 'none',
    customBaseURL: true,
    note: 'Roda no seu computador: sem limites, sem custo e o texto não sai da máquina. Precisa do Ollama aberto e do modelo baixado (ollama pull).'
  },
  {
    id: 'custom',
    name: 'Outro compatível',
    baseURL: '',
    defaultModel: '',
    free: false,
    key: 'optional',
    customBaseURL: true,
    note: 'Qualquer API no formato Chat Completions da OpenAI, como Cerebras, Mistral, Meta ou LM Studio.'
  }
]

export function getPreset(id: ProviderId): ProviderPreset {
  return PROVIDERS.find((preset) => preset.id === id)!
}

export function isProviderId(value: unknown): value is ProviderId {
  return PROVIDERS.some((preset) => preset.id === value)
}
