import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceEngine } from '../../../shared/ipc'

export type SpeechLanguage = 'en' | 'pt'

const PREFERRED_LOCALE: Record<SpeechLanguage, string> = { en: 'en-US', pt: 'pt-BR' }
// What Gemini sends when the audio comes without a WAV header.
const RAW_PCM_SAMPLE_RATE = 24_000

async function decodeAudio(context: AudioContext, base64: string): Promise<AudioBuffer> {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  const isWav = String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
  if (isWav) return context.decodeAudioData(bytes.buffer)

  // Raw 16-bit little-endian mono samples.
  const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2))
  const buffer = context.createBuffer(1, samples.length, RAW_PCM_SAMPLE_RATE)
  const channel = buffer.getChannelData(0)
  for (let index = 0; index < samples.length; index++) channel[index] = samples[index] / 0x8000
  return buffer
}

/**
 * Reads text aloud. The default engine is the voices installed in Windows: free, offline, no API.
 * With the Gemini engine the audio comes from Google, and Windows takes over whenever that fails.
 */
export function useSpeech(engine: VoiceEngine) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  /** Why the last request did not use the chosen engine. */
  const [notice, setNotice] = useState<string | null>(null)
  // Identifies the latest request, so that a slow answer for an older one is dropped.
  const request = useRef(0)
  const context = useRef<AudioContext>()
  const source = useRef<AudioBufferSourceNode>()

  const stop = useCallback(() => {
    request.current++
    speechSynthesis.cancel()
    source.current?.stop()
    source.current = undefined
    setSpeaking(false)
  }, [])

  useEffect(() => {
    // The voice list arrives asynchronously, after the first call.
    const loadVoices = () => setVoices(speechSynthesis.getVoices())
    // The window is minimized rather than closed, so speech would keep going in the background.
    const stopWhenHidden = () => {
      if (document.hidden) stop()
    }

    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      document.removeEventListener('visibilitychange', stopWhenHidden)
      stop()
    }
  }, [stop])

  const voiceFor = useCallback(
    (language: SpeechLanguage) => {
      const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language))
      return matching.find((voice) => voice.lang === PREFERRED_LOCALE[language]) ?? matching[0] ?? null
    },
    [voices]
  )

  const speakWithSystem = useCallback(
    (text: string, language: SpeechLanguage, id: number) => {
      const voice = voiceFor(language)
      if (!voice) return setSpeaking(false)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = voice.lang
      // Cancelling fires the old utterance's handlers late; only the current request may reset the state.
      const finish = () => {
        if (request.current === id) setSpeaking(false)
      }
      utterance.onend = finish
      utterance.onerror = finish
      speechSynthesis.speak(utterance)
    },
    [voiceFor]
  )

  const speak = useCallback(
    async (text: string, language: SpeechLanguage) => {
      if (!text) return
      stop()
      const id = ++request.current
      setSpeaking(true)
      setNotice(null)
      if (engine !== 'gemini') return speakWithSystem(text, language, id)

      const result = await window.api.synthesize(text)
      if (request.current !== id) return
      if (!result.ok) {
        setNotice(`${result.message} Usando a voz do Windows.`)
        return speakWithSystem(text, language, id)
      }

      try {
        context.current ??= new AudioContext()
        const buffer = await decodeAudio(context.current, result.data)
        if (request.current !== id) return
        const node = context.current.createBufferSource()
        node.buffer = buffer
        node.connect(context.current.destination)
        node.onended = () => {
          if (request.current === id) setSpeaking(false)
        }
        source.current = node
        node.start()
      } catch {
        setNotice('Não foi possível tocar o áudio do Gemini. Usando a voz do Windows.')
        speakWithSystem(text, language, id)
      }
    },
    [engine, stop, speakWithSystem]
  )

  /** False when neither engine has a voice for the language. */
  const canSpeak = useCallback(
    (language: SpeechLanguage) => engine === 'gemini' || voiceFor(language) !== null,
    [engine, voiceFor]
  )

  return { canSpeak, speaking, notice, speak, stop }
}
