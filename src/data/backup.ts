// Thin web adapter over @itera/core's backup orchestration. It holds no
// validation and no persistence logic - its only job is to supply the web app's
// active repository, so existing call sites keep their zero-argument ergonomics.
// Step 1.4 moves repository acquisition inside the hooks and deletes this file.
import {
  canReplaceImport as coreCanReplaceImport,
  exportBackup as coreExportBackup,
  importBackup as coreImportBackup,
  type BackupFile,
  type ImportMode,
} from '@itera/core'
import { getRepository } from './index'

export type { ImportMode }

export function exportBackup(): Promise<BackupFile> {
  return coreExportBackup(getRepository())
}

export function canReplaceImport(): boolean {
  return coreCanReplaceImport(getRepository())
}

export function importBackup(backup: BackupFile, mode: ImportMode): Promise<void> {
  return coreImportBackup(getRepository(), backup, mode)
}
