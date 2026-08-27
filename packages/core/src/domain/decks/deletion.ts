import type { Deck, ID } from '../../types'

// Whether a deck may be deleted, as one shared rule.
//
// The rule is product semantics, not storage semantics: `repo.decks.delete`
// removes exactly one row and cascades nothing, deliberately, so something above
// it has to decide whether removing that row would strand its contents. That
// decision lived inline in two web page components (the All Decks row's delete
// and the Collection view's two deletes), which meant a second Library on a
// second platform would have had to restate it - and a restated integrity rule
// is the kind that silently diverges.
//
// The predicate takes counts rather than the whole workspace because both
// callers already have them: web's from `computeDeckMetrics`, mobile's from the
// entities its screens already read. Copy stays platform-side; only the rule is
// shared.

export interface DeckDeletionSubject {
  /** Cards filed directly on this deck. Not its descendants' cards. */
  directCardCount: number
  /** Decks whose `parentId` is this deck. Non-zero means it is a Collection. */
  childDeckCount: number
}

export type DeckDeletionCheck =
  | { allowed: true }
  | { allowed: false; directCardCount: number; childDeckCount: number }

/**
 * A deck may be deleted only when nothing would be stranded by its removal.
 *
 * Blocked by its own cards or by child decks; the counts come back so the caller
 * can say which, in its own words.
 */
export function checkDeckDeletion(subject: DeckDeletionSubject): DeckDeletionCheck {
  const { directCardCount, childDeckCount } = subject
  if (directCardCount > 0 || childDeckCount > 0) {
    return { allowed: false, directCardCount, childDeckCount }
  }
  return { allowed: true }
}

/** How many decks name this one as their parent. */
export function childDeckCount(decks: Deck[], deckId: ID): number {
  return decks.filter((deck) => deck.parentId === deckId).length
}
