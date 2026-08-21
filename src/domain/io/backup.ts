import type { Card, Deck, Draft, ReviewLog, Roadmap } from '@/types'
import {
  assertValidCards,
  assertValidDecks,
  assertValidReviewLogs,
} from './validateBackupEntities'

// 2 = the single card model. Version 1 files hold the old 8-type v1 cards and
// a separate second card array; that format is prototype-era and unsupported, so
// parseBackup rejects it outright rather than importing rows of the wrong
// shape into the unified `cards` store.
export const BACKUP_VERSION = 2
export const MIN_SUPPORTED_BACKUP_VERSION = 2

export interface BackupData {
  cards: Card[]
  decks: Deck[]
  drafts: Draft[]
  reviewLogs: ReviewLog[]
  roadmaps?: Roadmap[] // added later; optional so older backups still import
}

// `app` is a legacy/compatibility format identifier, not the product name. It
// stays literally 'code-srs' so every backup exported before the Itera rebrand
// still imports; renaming it would silently invalidate every existing file.
export const BACKUP_APP_MARKER = 'code-srs'

export interface BackupFile {
  app: typeof BACKUP_APP_MARKER
  version: number
  exportedAt: number
  data: BackupData
}

export function buildBackup(data: BackupData): BackupFile {
  return { app: BACKUP_APP_MARKER, version: BACKUP_VERSION, exportedAt: Date.now(), data }
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

  if (obj.app !== BACKUP_APP_MARKER) {
    throw new Error('This does not look like an Itera backup.')
  }
  if (typeof obj.version !== 'number') {
    throw new Error('Backup is missing a version.')
  }
  if (obj.version > BACKUP_VERSION) {
    throw new Error(
      `Backup version ${obj.version} is newer than this app supports (${BACKUP_VERSION}).`,
    )
  }
  // Without this the guard above would let a version-1 file through, and its
  // v1 cards would be written into the unified store as if they were the new
  // shape — silent corruption rather than a clear refusal.
  if (obj.version < MIN_SUPPORTED_BACKUP_VERSION) {
    throw new Error(
      `Backup version ${obj.version} was created in an unsupported prototype data ` +
        `format and can no longer be imported (this app supports version ` +
        `${MIN_SUPPORTED_BACKUP_VERSION} and up).`,
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

  // Entity-level structure. Cards, decks, and ReviewLogs are validated before
  // import. ReviewLog validation is what prevents a version-2 backup from
  // silently reintroducing prototype history without required stateBefore.
  // Drafts and roadmaps keep list-presence validation only.
  // Referential integrity (card.deckId) needs repository state and therefore
  // lives in the import layer, src/data/backup.ts.
  assertValidDecks(data.decks as unknown[])
  assertValidCards(data.cards as unknown[])
  assertValidReviewLogs(data.reviewLogs as unknown[])

  return parsed as BackupFile
}
