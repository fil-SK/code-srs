// The application-facing tier of backup. Three layers, deliberately:
//
//   UI  ->  this module  ->  getRepository()  ->  data/backup.ts
//
// data/backup.ts keeps taking its Repository as an argument. That is what makes
// it testable against a Supabase double with no registry configured, and it
// stays the primitive both platforms build on. This module is the thin
// convenience above it: it resolves the *configured* repository at call time so
// no screen has to know one exists.
//
// The two non-hook helpers are not an oversight. Export and the Replace
// capability are read during render, not through a query, so a hook would buy
// nothing; `reviewWriteGuarantee()` in useReview.ts is the same shape for the
// same reason. What matters is that they resolve the repository here rather
// than in a component.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { canReplaceImport, exportBackup, importBackup, type ImportMode } from '../data/backup'
import type { BackupFile } from '../domain/io/backup'
import { getRepository } from '../data/registry'

export function useImportBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ backup, mode }: { backup: BackupFile; mode: ImportMode }) =>
      importBackup(getRepository(), backup, mode),
    // Refresh every view after a bulk write.
    onSuccess: () => qc.invalidateQueries(),
  })
}

// A snapshot of the configured workspace.
export function exportConfiguredBackup(): Promise<BackupFile> {
  return exportBackup(getRepository())
}

// Whether the configured backend can roll a failed Replace back. A capability
// of the active backend, not a branch on which backend it is.
export function canReplaceConfiguredImport(): boolean {
  return canReplaceImport(getRepository())
}
