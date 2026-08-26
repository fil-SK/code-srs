import {
  useDecks,
  useReviewLogs,
  useSearchCards,
  type Card,
  type CardQuery,
  type Deck,
  type ReviewLog,
} from '@itera/core'

// The entity read model every demo screen derives from, and the one place they
// obtain it.
//
// Screens used to read a mutable workspace object out of React context. They
// now read through the shared hooks, which resolve the configured repository -
// the same seam and the same query keys web uses - so a mutation performed by
// any shared mutation hook invalidates exactly the queries these subscribe to,
// and every surface re-derives. There is no second notification path and no
// entity mirror.

export interface DemoEntities {
  decks: Deck[]
  cards: Card[]
  reviewLogs: ReviewLog[]
}

/**
 * The whole card set, suspended cards included.
 *
 * Module-level rather than inline, because qk.cardsSearch embeds the query
 * object in the query key: a fresh literal on every render would mint a new
 * cache entry per render and refetch forever. One frozen value, one cache
 * entry.
 *
 * includeSuspended is true because these entities feed *every* surface,
 * including the deck card list and its status filter, which must be able to
 * show a suspended card. Due-ness and suspension are applied by the selectors
 * that care (see demoScheduling's isDemoCardDue, which excludes suspended
 * cards) rather than by narrowing the shared read.
 */
const ALL_CARDS: CardQuery = Object.freeze({ includeSuspended: true })

export interface DemoEntitiesResult extends DemoEntities {
  /**
   * True until all three reads have resolved once.
   *
   * An in-memory repository resolves on the next microtask, so this is one
   * frame in practice - but it is a real frame, and a screen that rendered its
   * empty state during it would flash "no decks" on every mount.
   */
  isLoading: boolean
}

export function useDemoEntities(): DemoEntitiesResult {
  const decks = useDecks()
  const cards = useSearchCards(ALL_CARDS)
  const reviewLogs = useReviewLogs()

  return {
    decks: decks.data ?? [],
    cards: cards.data ?? [],
    reviewLogs: reviewLogs.data ?? [],
    isLoading: decks.isPending || cards.isPending || reviewLogs.isPending,
  }
}
