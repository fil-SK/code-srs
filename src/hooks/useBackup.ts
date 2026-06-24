import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importBackup, type ImportMode } from '@/data/backup'
import type { BackupFile } from '@/domain/io/backup'

export function useImportBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ backup, mode }: { backup: BackupFile; mode: ImportMode }) =>
      importBackup(backup, mode),
    // Refresh every view after a bulk write.
    onSuccess: () => qc.invalidateQueries(),
  })
}
