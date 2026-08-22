import type { ID } from '../types'
import type { Repository, WorkspaceSnapshot } from './repository'
import { buildBackup, type BackupFile } from '../domain/io/backup'
import { findUnresolvedDeckReference } from '../domain/io/validateBackupEntities'
import { ImportFailure } from '../domain/io/importFailure'

// Backend-neutral backup orchestration. Every function here takes the repository
// it should act on rather than reaching for an ambient one: which backend is
// active, and how the platform decided that, is not this module's business.

export type ImportMode = 'merge' | 'replace'

// Gather everything into a backup envelope.
export async function exportBackup(repo: Repository): Promise<BackupFile> {
  const [cards, decks, drafts, reviewLogs, roadmaps] = await Promise.all([
    repo.cards.getAll(),
    repo.decks.getAll(),
    repo.drafts.getAll(),
    repo.reviews.all(),
    repo.roadmaps.getAll(),
  ])
  return buildBackup({ cards, decks, drafts, reviewLogs, roadmaps })
}

// Whether the given backend can perform a replace-import safely. False means
// the backend cannot restore what a failed replace would already have deleted,
// so the mode is not offered at all rather than offered with a warning.
export function canReplaceImport(repo: Repository): boolean {
  return repo.importGuarantee === 'transactional'
}

// Write a backup into storage. 'replace' discards existing data first; 'merge'
// upserts (entries with matching ids are overwritten).
//
// Two guards stand in front of the write, and neither is optional:
//
//  1. parseBackup has already checked every entity's own structure. The one
//     rule it cannot check is referential - whether each card's deck exists,
//     which under Merge legitimately includes decks the repository already
//     holds - so that check runs here, before anything is written.
//  2. The write itself goes through the seam's whole-workspace operations,
//     because validation alone cannot prevent a quota, IndexedDB or network
//     failure mid-write. On Dexie those are one transaction and a failure rolls
//     back; on Supabase replaceAll is refused outright. Either way a failed
//     import never silently costs the user their workspace (audit P1-1).
export async function importBackup(
  repo: Repository,
  backup: BackupFile,
  mode: ImportMode,
): Promise<void> {
  await assertDeckReferencesResolve(repo, backup, mode)

  const snapshot: WorkspaceSnapshot = {
    cards: backup.data.cards,
    decks: backup.data.decks,
    drafts: backup.data.drafts,
    reviewLogs: backup.data.reviewLogs,
    roadmaps: backup.data.roadmaps ?? [],
  }

  try {
    if (mode === 'replace') await repo.replaceAll(snapshot)
    else await repo.mergeAll(snapshot)
  } catch (cause) {
    if (cause instanceof ImportFailure) throw cause
    throw new ImportFailure(
      'The backup could not be written to storage.',
      'write',
      // Merge is additive: a failure leaves the previous workspace intact but
      // may already have upserted part of the file, so only a transactional
      // backend can claim nothing changed.
      repo.importGuarantee === 'transactional',
      { cause },
    )
  }
}

async function assertDeckReferencesResolve(
  repo: Repository,
  backup: BackupFile,
  mode: ImportMode,
): Promise<void> {
  const known = new Set<ID>(backup.data.decks.map((d) => d.id))
  // Replace discards everything first, so only the file's own decks can resolve.
  if (mode === 'merge') {
    for (const deck of await repo.decks.getAll()) known.add(deck.id)
  }

  const orphan = findUnresolvedDeckReference(backup.data.cards, known)
  if (!orphan) return

  throw new ImportFailure(
    `Card "${orphan.id}" belongs to deck "${orphan.deckId}", which is not in this file` +
      (mode === 'merge' ? ' or in your library' : '') +
      '. Nothing was imported.',
    'validation',
    true,
  )
}
