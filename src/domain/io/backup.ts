import type { Card, Deck, Draft, ReviewLog } from '@/types'

export const BACKUP_VERSION = 1

export interface BackupData {
  cards: Card[]
  decks: Deck[]
  drafts: Draft[]
  reviewLogs: ReviewLog[]
}

export interface BackupFile {
  app: 'code-srs'
  version: number
  exportedAt: number
  data: BackupData
}

export function buildBackup(data: BackupData): BackupFile {
  return { app: 'code-srs', version: BACKUP_VERSION, exportedAt: Date.now(), data }
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2)
}

// Parse and validate a backup file, throwing a user-friendly Error on problems.
export function parseBackup(json: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Unexpected file format.')
  }
  const obj = parsed as Record<string, unknown>

  if (obj.app !== 'code-srs') {
    throw new Error('This does not look like a code-srs backup.')
  }
  if (typeof obj.version !== 'number') {
    throw new Error('Backup is missing a version.')
  }
  if (obj.version > BACKUP_VERSION) {
    throw new Error(
      `Backup version ${obj.version} is newer than this app supports (${BACKUP_VERSION}).`,
    )
  }

  const data = obj.data as Record<string, unknown> | undefined
  if (!data || typeof data !== 'object') {
    throw new Error('Backup is missing its data.')
  }
  for (const key of ['cards', 'decks', 'drafts', 'reviewLogs'] as const) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Backup is missing or has an invalid "${key}" list.`)
    }
  }

  return parsed as BackupFile
}
