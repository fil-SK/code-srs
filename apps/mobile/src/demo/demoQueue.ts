import type { ID, Millis } from '@itera/core'

import type { DemoCard, DemoWorkspace } from './demoWorkspace'
import { isDemoCardDue } from './demoScheduling'

// The demo session queue.
//
// Deliberately simpler than web's `useSessionQueue`, and deliberately not a
// reimplementation of it: web's version exists to turn a repository query plus
// a deck subtree into a stable snapshot, and neither of those exists here. What
// is shared is the semantics it encodes - due cards only, ordered by how
// overdue they are, snapshotted once so grading a card cannot reshuffle the
// session under the learner.
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
  /** Scope to one deck, the same semantics web puts behind `?deck=`. */
  deckId?: ID
  limit?: number
}

export function createDemoQueue(
  workspace: DemoWorkspace,
  { now, deckId, limit = DEMO_SESSION_LIMIT }: DemoQueueOptions,
): DemoCard[] {
  return workspace.cards
    .filter((card) => isDemoCardDue(card, now))
    .filter((card) => deckId === undefined || card.deckId === deckId)
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
