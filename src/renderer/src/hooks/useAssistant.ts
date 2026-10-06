import { useEffect, useReducer } from 'react'
import type { ErrorCode, Mode, SessionEvent } from '../../../shared/ipc'

export type Session = {
  id: number
  source: string
  result: string
  mode: Mode | null
  status: 'loading' | 'streaming' | 'done' | 'error'
  error: { code: ErrorCode; message: string } | null
}

function reducer(state: Session | null, event: SessionEvent): Session | null {
  if (event.type === 'start') {
    return { id: event.id, source: event.source, result: '', mode: null, status: 'loading', error: null }
  }
  // Late events from a session that has already been replaced.
  if (!state || state.id !== event.id) return state

  switch (event.type) {
    case 'mode':
      return { ...state, mode: event.mode }
    case 'delta':
      return { ...state, status: 'streaming', result: state.result + event.delta }
    case 'done':
      return { ...state, status: 'done', result: event.text }
    case 'error':
      return { ...state, status: 'error', error: { code: event.code, message: event.message } }
  }
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
