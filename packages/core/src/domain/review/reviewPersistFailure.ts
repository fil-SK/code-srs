import type { WriteGuarantee } from '../../data/repository'

// The one place that decides what a failed review write tells the learner.
//
// Same rule as src/domain/io/importFailure.ts, for the same reason: raw backend
// text must never reach the screen (IndexedDB's "Failed to execute 'add' on
// 'IDBObjectStore'", PostgREST's error bodies, SQL from a raised exception), and
// the message must never promise more than the backend actually guaranteed.
// Whether the grade survived a failure is a property of the storage layer, so it
// is read from the seam rather than assumed here.

const CANNOT_SAVE = "We couldn't save this review."
const CANNOT_UNDO = "We couldn't undo this review."

// A transactional backend rolled both writes back, so nothing moved and saying
// so is honest and reassuring. A best-effort backend cannot promise that, and
// must not be given copy that implies it - the learner needs to know the
// workspace may be inconsistent, not be told it is fine.
//
// No "try again" here: this copy is rendered beside a retry button, and the
// undo copy below is not, which is why only that one names its next step.
export function describeReviewCommitFailure(guarantee: WriteGuarantee): string {
  return guarantee === 'transactional'
    ? `${CANNOT_SAVE} Nothing was changed - your progress is exactly as it was before you ` +
        'graded this card.'
    : `${CANNOT_SAVE} Part of it may have been recorded, so your progress for this card may ` +
        'be inconsistent.'
}

export function describeReviewUndoFailure(guarantee: WriteGuarantee): string {
  return guarantee === 'transactional'
    ? `${CANNOT_UNDO} Nothing was changed - the review is still recorded. Try again.`
    : `${CANNOT_UNDO} Part of it may have been reversed, so this card's history may be ` +
        'inconsistent. Try again.'
}
