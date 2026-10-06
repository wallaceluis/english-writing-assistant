import { useCallback, useEffect, useReducer } from 'react'
import type { Direction, ErrorCode, HistoryEntry, Mode, SessionEvent, Tone } from '../../../shared/ipc'

export type Session = {
  id: number
  source: string
  direction: Direction
  tone: Tone
  /** Started by the "translate and listen" shortcut. */
  speak: boolean
  result: string
  mode: Mode | null
  /** Who is answering; `fallback` when an earlier provider failed. */
  provider: { name: string; model: string; fallback: boolean } | null
  status: 'loading' | 'streaming' | 'done' | 'error'
  error: { code: ErrorCode; message: string } | null
}

// `restore` never comes from the main process: it reopens a finished result from the history.
type Action = SessionEvent | { type: 'restore'; entry: HistoryEntry }

function reducer(state: Session | null, event: Action): Session | null {
  if (event.type === 'restore') {
    const { id, at: _at, provider, ...entry } = event.entry
    // Negative so it can never collide with an id handed out by the main process.
    return { ...entry, id: -id, speak: false, provider: { name: provider, model: '', fallback: false }, status: 'done', error: null }
  }
  if (event.type === 'start') {
    const { type: _type, ...request } = event
    return { ...request, result: '', mode: null, provider: null, status: 'loading', error: null }
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

// Mirrors the session driven by the main process; null until a shortcut is first used.
export function useAssistant(): { session: Session | null; restore: (entry: HistoryEntry) => void } {
  const [session, dispatch] = useReducer(reducer, null)

  useEffect(() => {
    const unsubscribe = window.api.onSessionEvent(dispatch)
    window.api.ready()
    return unsubscribe
  }, [])

  const restore = useCallback((entry: HistoryEntry) => dispatch({ type: 'restore', entry }), [])

  return { session, restore }
}
