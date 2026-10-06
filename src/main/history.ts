import { app } from 'electron'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { HistoryEntry } from '../shared/ipc'

const MAX_ENTRIES = 50

// Plain JSON next to the settings: the texts never leave this computer.
const historyFile = (): string => join(app.getPath('userData'), 'history.json')

/** Newest first. */
export function listHistory(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(historyFile(), 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'at'>): void {
  const now = new Date()
  const entries = [{ ...entry, id: now.getTime(), at: now.toISOString() }, ...listHistory()].slice(0, MAX_ENTRIES)
  mkdirSync(dirname(historyFile()), { recursive: true })
  writeFileSync(historyFile(), JSON.stringify(entries, null, 2))
}

export function clearHistory(): void {
  rmSync(historyFile(), { force: true })
}
