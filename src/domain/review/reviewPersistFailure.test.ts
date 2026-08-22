import { describe, expect, it } from 'vitest'
import {
  describeReviewCommitFailure,
  describeReviewUndoFailure,
} from './reviewPersistFailure'

// The copy must never promise more than the backend guaranteed - the same rule
// importFailure.ts follows, and the reason this lives in one pure module rather
// than inline in the Review shell.

describe('describeReviewCommitFailure', () => {
  it('says nothing was changed when the write rolled back', () => {
    const text = describeReviewCommitFailure('transactional')
    expect(text).toMatch(/couldn't save this review/i)
    expect(text).toMatch(/nothing was changed/i)
    // The retry affordance is the adjacent button, not a sentence.
    expect(text).not.toMatch(/try again/i)
  })

  it('never claims safety when the backend cannot promise it', () => {
    const text = describeReviewCommitFailure('best-effort')
    expect(text).not.toMatch(/nothing was changed/i)
    expect(text).toMatch(/may have been recorded/i)
  })
})

describe('describeReviewUndoFailure', () => {
  it('says the review is still recorded when the undo rolled back', () => {
    const text = describeReviewUndoFailure('transactional')
    expect(text).toMatch(/couldn't undo this review/i)
    expect(text).toMatch(/still recorded/i)
  })

  it('never claims safety when the backend cannot promise it', () => {
    const text = describeReviewUndoFailure('best-effort')
    expect(text).not.toMatch(/nothing was changed/i)
    expect(text).toMatch(/may have been reversed/i)
  })
})

describe('review failure copy', () => {
  it('is free of backend vocabulary the learner cannot act on', () => {
    const all = [
      describeReviewCommitFailure('transactional'),
      describeReviewCommitFailure('best-effort'),
      describeReviewUndoFailure('transactional'),
      describeReviewUndoFailure('best-effort'),
    ]
    for (const text of all) {
      expect(text).not.toMatch(
        /IDBObjectStore|IndexedDB|DataError|ConstraintError|Postgrest|PGRST|RLS|jsonb|rpc/i,
      )
    }
  })
})
