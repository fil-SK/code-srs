import type { ID } from '@/types'
import { getRepository } from './index'
import { buildBackup, type BackupFile } from '@/domain/io/backup'
import { findUnresolvedDeckReference } from '@/domain/io/validateBackupEntities'

export type ImportMode = 'merge' | 'replace'

// Gather everything into a backup envelope.
export async function exportBackup(): Promise<BackupFile> {
  const repo = getRepository()
  const [cards, decks, drafts, reviewLogs, roadmaps] = await Promise.all([
    repo.cards.getAll(),
    repo.decks.getAll(),
    repo.drafts.getAll(),
    repo.reviews.all(),
    repo.roadmaps.getAll(),
  ])
  return buildBackup({ cards, decks, drafts, reviewLogs, roadmaps })
}

// Write a backup into storage. 'replace' wipes existing data first; 'merge'
// upserts (entries with matching ids are overwritten).
//
// parseBackup has already checked every entity's own structure. The one rule it
// cannot check is referential: whether each card's deck exists, which under
// Merge legitimately includes decks the repository already holds. That check
// therefore lives here, and runs BEFORE the replace-mode clear() so a rejected
// import can never leave the store half-written.
export async function importBackup(
  backup: BackupFile,
  mode: ImportMode,
): Promise<void> {
  const repo = getRepository()

  await assertDeckReferencesResolve(backup, mode, repo)

  if (mode === 'replace') {
    await Promise.all([
      repo.cards.clear(),
      repo.decks.clear(),
      repo.drafts.clear(),
      repo.reviews.clear(),
      repo.roadmaps.clear(),
    ])
  }

  await Promise.all([
    repo.cards.bulkPut(backup.data.cards),
    repo.decks.bulkPut(backup.data.decks),
    repo.drafts.bulkPut(backup.data.drafts),
    repo.reviews.bulkPut(backup.data.reviewLogs),
    repo.roadmaps.bulkPut(backup.data.roadmaps ?? []),
  ])
}

async function assertDeckReferencesResolve(
  backup: BackupFile,
  mode: ImportMode,
  repo: ReturnType<typeof getRepository>,
): Promise<void> {
  const known = new Set<ID>(backup.data.decks.map((d) => d.id))
  // Replace discards everything first, so only the file's own decks can resolve.
  if (mode === 'merge') {
    for (const deck of await repo.decks.getAll()) known.add(deck.id)
  }

  const orphan = findUnresolvedDeckReference(backup.data.cards, known)
  if (!orphan) return

  throw new Error(
    `Card "${orphan.id}" belongs to deck "${orphan.deckId}", which is not in this file` +
      (mode === 'merge' ? ' or in your library' : '') +
      '. Nothing was imported.',
  )
}
