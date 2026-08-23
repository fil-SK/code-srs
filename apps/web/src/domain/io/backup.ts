// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/io/backup.ts and is published as @itera/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@itera/core'
// directly; this layer is transitional.

export {
  BACKUP_APP_MARKER,
  BACKUP_VERSION,
  MIN_SUPPORTED_BACKUP_VERSION,
  buildBackup,
  parseBackup,
  serializeBackup,
} from '@itera/core'

export type { BackupData, BackupFile } from '@itera/core'
