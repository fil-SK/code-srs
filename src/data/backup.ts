import { getRepository } from './index'
import { buildBackup, type BackupFile } from '@/domain/io/backup'

export type ImportMode = 'merge' | 'replace'

// Gather everything into a backup envelope.
export async function exportBackup(): Promise<BackupFile> {
  const repo = getRepository()
  const [cards, decks, drafts, reviewLogs] = await Promise.all([
    repo.cards.getAll(),
    repo.decks.getAll(),
    repo.drafts.getAll(),
    repo.reviews.all(),
  ])
  return buildBackup({ cards, decks, drafts, reviewLogs })
}

// Write a backup into storage. 'replace' wipes existing data first; 'merge'
// upserts (entries with matching ids are overwritten).
export async function importBackup(
  backup: BackupFile,
  mode: ImportMode,
): Promise<void> {
  const repo = getRepository()

  if (mode === 'replace') {
    await Promise.all([
      repo.cards.clear(),
      repo.decks.clear(),
      repo.drafts.clear(),
      repo.reviews.clear(),
    ])
  }

  await Promise.all([
    repo.cards.bulkPut(backup.data.cards),
    repo.decks.bulkPut(backup.data.decks),
    repo.drafts.bulkPut(backup.data.drafts),
    repo.reviews.bulkPut(backup.data.reviewLogs),
  ])
}
