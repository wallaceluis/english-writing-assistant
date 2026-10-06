import { useEffect, useReducer } from 'react'
import type { SessionEvent } from '../../../shared/ipc'

export type Session = {
  id: number
  source: string
}

function reducer(_state: Session | null, event: SessionEvent): Session | null {
  return { id: event.id, source: event.source }
}

// Mirrors the session driven by the main process; null until the shortcut is first used.
export function useAssistant(): Session | null {
  const [session, dispatch] = useReducer(reducer, null)

  useEffect(() => {
    const unsubscribe = window.api.onSessionEvent(dispatch)
    window.api.ready()
    return unsubscribe
  }, [])

  return session
}
