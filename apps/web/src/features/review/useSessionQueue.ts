import { useState } from 'react'
import type { Card } from '@/types'

export interface ReviewSession {
  /**
   * Monotonic per-mount snapshot id. Used as the session component's React
   * key, so exactly one thing can remount a session: a genuinely new snapshot.
   */
  id: number
  /** The resolved configuration this queue was built for (deck + limit). */
  scopeKey: string
  /** The queue, frozen at the instant the session started. */
  cards: Card[]
}

// A review session's queue is a snapshot, not a live query result.
//
// It used to be live, and that was a real bug: grading invalidates the `cards`
// query key, `useDueCards` refetches, the graded card drops out of the due
// list, and anything derived from that array changes underneath the running
// session. ReviewPage keyed the session component on `cards.length`, so every
// grade remounted it - resetting the position to the first remaining card,
// shrinking the "X of Y" total, discarding the undo stack, and, after the last
// card, emptying the due list so ReviewPage rendered its pre-session "Nothing
// due" state instead of the session's own "All done" screen.
//
// Lifecycle contract (documented in docs/architecture.md):
//
//   Created   - when there is no snapshot yet, or when `scopeKey` changes
//               (the URL's deck/limit changed in place). Taking one bumps
//               `id`, which remounts the session cleanly.
//   Lives     - for as long as ReviewPage stays mounted on the same scopeKey.
//               Refetches, invalidations, reordering and shrinking of the live
//               due result are all ignored: the queue, its order and its total
//               are whatever the session started with.
//   Ends      - when ReviewPage unmounts. Both exits from a session (Exit
//               session, and Back to Today on the completion screen) navigate
//               away from /review, so React Router unmounts the route element
//               and this state goes with it.
//
// That last point is what makes a *later* session with identical query
// parameters correct: it is a new mount holding no state, so it resolves the
// due queue again from current repository state rather than reusing the
// previous snapshot. Session identity is transient and per-mount on purpose -
// no persisted StudySession entity was introduced for this.
export function useSessionQueue(scopeKey: string, cards: Card[] | undefined): ReviewSession | null {
  const [session, setSession] = useState<ReviewSession | null>(null)

  // Adjusting state during render (rather than in an effect) so the very first
  // render with resolved cards already has its snapshot - an effect would emit
  // one frame in which the queue is loaded but the session is not, which
  // ReviewPage would paint as a spinner.
  if (cards && session?.scopeKey !== scopeKey) {
    const next = { id: (session?.id ?? 0) + 1, scopeKey, cards }
    setSession(next)
    return next
  }

  return session
}
