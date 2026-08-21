// The one place that decides what a failed import tells the user.
//
// Two things went wrong before this module existed: the Import / Export section
// rendered `(e as Error).message` directly, so a rejected write surfaced raw
// IndexedDB text ("Failed to execute 'put' on 'IDBObjectStore'…"), and nothing
// distinguished "the file was refused before anything was touched" from "the
// write failed after storage had already been changed". The second distinction
// is the honest half of the replace-import guarantee, so it is carried on the
// error itself rather than guessed at the UI.

export type ImportFailureStage =
  | 'validation' // the file was refused; storage was never touched
  | 'write' // persistence failed; `workspaceUnchanged` says what that cost

export class ImportFailure extends Error {
  readonly stage: ImportFailureStage
  // True only when the backend guarantees the previous workspace survived the
  // failure. Never set optimistically: a backend that cannot promise it says so.
  readonly workspaceUnchanged: boolean

  constructor(
    message: string,
    stage: ImportFailureStage,
    workspaceUnchanged: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'ImportFailure'
    this.stage = stage
    this.workspaceUnchanged = workspaceUnchanged
  }
}

// Storage pressure is the one persistence failure worth naming, because the
// user can act on it. Browsers signal it as a DOMException named
// QuotaExceededError; Dexie wraps the original in `cause`.
function isQuotaFailure(error: unknown): boolean {
  let current = error
  for (let depth = 0; current && depth < 5; depth += 1) {
    const e = current as { name?: unknown; message?: unknown; cause?: unknown }
    if (e.name === 'QuotaExceededError') return true
    if (typeof e.message === 'string' && /quota/i.test(e.message)) return true
    current = e.cause
  }
  return false
}

const OUT_OF_SPACE = 'Your browser is out of storage space for Itera.'

// Entity validation names the offending field but does not say what that meant
// for the user's data. Every refusal happens before the first write, so say so
// once, here, rather than restating it in a dozen validator messages.
function rejectedBeforeImport(message: string): string {
  const text = message.trim()
  if (/Nothing was (imported|changed)/i.test(text)) return text
  return `${text} This backup was rejected before anything was imported, so nothing was changed.`
}

// User-facing text for anything thrown by the import flow: JSON parse errors,
// entity validation from parseBackup, the deck-reference rule, and persistence.
export function describeImportFailure(error: unknown): string {
  if (error instanceof ImportFailure) {
    // Validation messages are authored for humans and name what was wrong.
    if (error.stage === 'validation') return rejectedBeforeImport(error.message)

    const cause = isQuotaFailure(error) ? `${OUT_OF_SPACE} ` : ''
    return error.workspaceUnchanged
      ? `${cause}This backup could not be saved, so nothing was changed. Your existing cards, ` +
          'decks and review history are exactly as they were.'
      : `${cause}This backup could not be saved and the import stopped partway through, so your ` +
          'data may now be incomplete. Import a known-good backup to restore it.'
  }

  // parseBackup's own errors, which are written as user-facing sentences and
  // are likewise raised before any write.
  if (error instanceof Error && error.message.trim()) return rejectedBeforeImport(error.message)

  return 'That backup could not be imported.'
}
