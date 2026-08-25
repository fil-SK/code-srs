import { subtreeIds, type ID, type Millis } from '@itera/core'

import type { DemoCard, DemoWorkspace } from './demoWorkspace'
import { isDemoCardDue } from './demoScheduling'

// The demo session queue.
//
// Deliberately simpler than web's `useSessionQueue`, and deliberately not a
// reimplementation of it: web's version exists to turn a repository query into
// a stable snapshot, and that does not exist here. What is shared is the
// semantics it encodes - due cards only, ordered by how overdue they are,
// snapshotted once so grading a card cannot reshuffle the session under the
// learner.
//
// The one piece of scoping semantics *is* shared, through core's `subtreeIds`.
// Web's `?deck=` means a deck and its whole subtree, and a mobile queue that
// meant "exactly this deck" would be a second definition of what studying a
// deck is. Demo decks are flat - they carry a `collectionId`, never a
// `parentId` - so the resolved set is the deck itself today; the point is that
// it stops being the deck itself for the right reason if that ever changes.
//
// The tie-break on `id` is what makes a demo reproducible. The seeded due dates
// are authored in whole and half days, so several cards share an instant;
// without a deterministic second key, two runs of the same demo would show the
// same cards in a different order and a recorded walkthrough could not be
// repeated.

/** Bounded so a demo session ends. Every demo card being due is not a session. */
export const DEMO_SESSION_LIMIT = 20

export interface DemoQueueOptions {
  now: Millis
  /** Scope to one deck and its subtree, the semantics web puts behind `?deck=`. */
  deckId?: ID
  limit?: number
}

/**
 * The deck ids a scoped session covers: the named deck plus every descendant,
 * resolved by core's own `subtreeIds` rather than by an equality check here.
 *
 * An id that names no demo deck resolves to itself and therefore matches
 * nothing, which is why this stays pure and the honest not-found state lives at
 * the route - a queue helper cannot navigate, and quietly widening an unknown
 * scope to every card is the one outcome that must not happen.
 */
export function demoDeckScopeIds(workspace: DemoWorkspace, deckId: ID): Set<ID> {
  return new Set(subtreeIds(workspace.decks, deckId))
}

export function createDemoQueue(
  workspace: DemoWorkspace,
  { now, deckId, limit = DEMO_SESSION_LIMIT }: DemoQueueOptions,
): DemoCard[] {
  const scope = deckId === undefined ? null : demoDeckScopeIds(workspace, deckId)
  return workspace.cards
    .filter((card) => isDemoCardDue(card, now))
    .filter((card) => scope === null || scope.has(card.deckId))
    .sort((a, b) => a.scheduling.due - b.scheduling.due || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, limit)
}

/** The deck names contributing to a queue, in queue order, without repeats. */
export function demoQueueDeckNames(workspace: DemoWorkspace, queue: DemoCard[]): string[] {
  const names: string[] = []
  for (const card of queue) {
    const name = workspace.decks.find((deck) => deck.id === card.deckId)?.name
    if (name && !names.includes(name)) names.push(name)
  }
  return names
}
