import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeechLanguage = 'en' | 'pt'

const PREFERRED_LOCALE: Record<SpeechLanguage, string> = { en: 'en-US', pt: 'pt-BR' }

// Reads text aloud with the voices installed in Windows: free, offline and with no API involved.
export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [speaking, setSpeaking] = useState(false)
  const current = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    current.current = null
    speechSynthesis.cancel()
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

  const speak = useCallback(
    (text: string, language: SpeechLanguage) => {
      const voice = voiceFor(language)
      if (!voice || !text) return
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = voice.lang
      // Cancelling fires the old utterance's handlers late; only the current one may reset the state.
      const finish = () => {
        if (current.current !== utterance) return
        current.current = null
        setSpeaking(false)
      }
      utterance.onend = finish
      utterance.onerror = finish
      current.current = utterance
      setSpeaking(true)
      speechSynthesis.speak(utterance)
    },
    [voiceFor]
  )

  /** False when Windows has no voice installed for the language. */
  const canSpeak = useCallback((language: SpeechLanguage) => voiceFor(language) !== null, [voiceFor])

  return { canSpeak, speaking, speak, stop }
}
