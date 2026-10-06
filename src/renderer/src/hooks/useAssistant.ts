import { useEffect, useReducer } from 'react'
import type { ErrorCode, Mode, SessionEvent } from '../../../shared/ipc'

export type Session = {
  id: number
  source: string
  /** Started by the "translate and listen" shortcut. */
  speak: boolean
  result: string
  mode: Mode | null
  /** Who is answering; `fallback` when an earlier provider failed. */
  provider: { name: string; model: string; fallback: boolean } | null
  status: 'loading' | 'streaming' | 'done' | 'error'
  error: { code: ErrorCode; message: string } | null
}

function reducer(state: Session | null, event: SessionEvent): Session | null {
  if (event.type === 'start') {
    return { id: event.id, source: event.source, speak: event.speak, result: '', mode: null, provider: null, status: 'loading', error: null }
  }
  // Late events from a session that has already been replaced.
  if (!state || state.id !== event.id) return state

  switch (event.type) {
    case 'provider':
      // Whatever the previous provider streamed before failing is thrown away.
      return {
        ...state,
        provider: { name: event.name, model: event.model, fallback: event.fallback },
        result: '',
        mode: null,
        status: 'loading'
      }
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
