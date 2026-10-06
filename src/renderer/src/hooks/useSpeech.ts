import { useCallback, useEffect, useRef, useState } from 'react'

// Reads text aloud with the English voices installed in Windows: free, offline and with no API involved.
export function useSpeech() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const current = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    current.current = null
    speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  useEffect(() => {
    // The voice list arrives asynchronously, after the first call.
    const pickVoice = () => {
      const english = speechSynthesis.getVoices().filter((candidate) => candidate.lang.toLowerCase().startsWith('en'))
      setVoice(english.find((candidate) => candidate.lang === 'en-US') ?? english[0] ?? null)
    }
    // The window is minimized rather than closed, so speech would keep going in the background.
    const stopWhenHidden = () => {
      if (document.hidden) stop()
    }

    pickVoice()
    speechSynthesis.addEventListener('voiceschanged', pickVoice)
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', pickVoice)
      document.removeEventListener('visibilitychange', stopWhenHidden)
      stop()
    }
  }, [stop])

  const speak = useCallback(
    (text: string) => {
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
    [voice]
  )

  return { available: voice !== null, speaking, speak, stop }
}
