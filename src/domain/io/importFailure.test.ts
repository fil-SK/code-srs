import { describe, expect, it } from 'vitest'
import { describeImportFailure, ImportFailure } from './importFailure'

// What the Import / Export section actually renders. The rule these tests pin
// down: never raw browser text, and never a claim of safety the backend did not
// make (audit P1-1 showed both).

describe('describeImportFailure', () => {
  // A message that already states the outcome is left exactly as written.
  it('passes a validation message that already says nothing was imported through unchanged', () => {
    const failure = new ImportFailure(
      'Card "orphan" belongs to deck "gone", which is not in this file. Nothing was imported.',
      'validation',
      true,
    )
    expect(describeImportFailure(failure)).toBe(failure.message)
  })

  // The entity validators name the bad field only; the outcome is added here so
  // a rejection never reads as though it might have half-applied.
  it('says a rejected backup was refused before anything was imported', () => {
    const failure = new ImportFailure('Roadmap 1 is missing a valid "id".', 'validation', true)
    const text = describeImportFailure(failure)
    expect(text).toMatch(/^Roadmap 1 is missing a valid "id"\./)
    expect(text).toMatch(/rejected before anything was imported/)
  })

  it('says the same for a parseBackup error', () => {
    const text = describeImportFailure(new Error('That file is not valid JSON.'))
    expect(text).toMatch(/^That file is not valid JSON\./)
    expect(text).toMatch(/nothing was changed/)
  })

  it('states that nothing changed when the backend rolled back', () => {
    const failure = new ImportFailure('write failed', 'write', true, {
      cause: new Error("Failed to execute 'put' on 'IDBObjectStore'"),
    })
    const text = describeImportFailure(failure)
    expect(text).toMatch(/nothing was changed/i)
    expect(text).toMatch(/exactly as they were/i)
  })

  it('never leaks the underlying IndexedDB error text', () => {
    const failure = new ImportFailure('write failed', 'write', true, {
      cause: new Error(
        "Failed to execute 'put' on 'IDBObjectStore': Evaluating the object store's key path did not yield a value.",
      ),
    })
    expect(describeImportFailure(failure)).not.toMatch(/IDBObjectStore|key path/)
  })

  it('does not claim safety when the backend cannot promise it', () => {
    const failure = new ImportFailure('write failed', 'write', false)
    const text = describeImportFailure(failure)
    expect(text).toMatch(/may now be incomplete/i)
    expect(text).not.toMatch(/nothing was changed/i)
  })

  it('names storage pressure when that is the cause', () => {
    const quota = Object.assign(new Error('quota exceeded'), { name: 'QuotaExceededError' })
    const failure = new ImportFailure('write failed', 'write', true, {
      cause: new Error('bulkPut failed', { cause: quota }),
    })
    expect(describeImportFailure(failure)).toMatch(/out of storage space/i)
  })

  it('falls back to a plain sentence for a non-Error throw', () => {
    expect(describeImportFailure('boom')).toBe('That backup could not be imported.')
  })
})
