import { configureRepository, type Millis, type WorkspaceSnapshot } from '@itera/core'

import { InMemoryRepository } from '@/src/data/InMemoryRepository'
import { createDemoSeed, type DemoSeed } from './demoWorkspace'

// Demo mode's composition point, and the counterpart of composition.ts for
// cloud. Called once from app/_layout.tsx, before anything can query.
//
// It owns two things and nothing else: the repository instance, and the instant
// the run is anchored to. Both have to live outside React, because
// getRepository() is resolved from module scope by every shared hook and cannot
// reach into a component's state.
//
// startedAt is recorded here rather than re-read at reset. That is what makes
// Reset Demo deterministic: every reset within one app run rebuilds from the
// same anchor and therefore reproduces byte-identical state, instead of
// drifting forward with the wall clock (D417).

let repository: InMemoryRepository | null = null
let startedAt: Millis = 0

function toSnapshot(seed: DemoSeed): WorkspaceSnapshot {
  // Drafts and roadmaps are empty rather than absent: the demo has neither, and
  // a backend whose stores exist but are empty is a truthful description of
  // that, where a missing store would be a hole for the next caller.
  return {
    cards: seed.cards,
    decks: seed.decks,
    drafts: [],
    reviewLogs: seed.reviewLogs,
    roadmaps: [],
  }
}

/**
 * Build the demo backend and register it as the app's repository.
 *
 * Returns the seed so the composition root can hand the notification inbox -
 * the one part of the dataset with no Repository store - to the demo provider
 * without building the dataset twice.
 */
export function composeDemoRepository(now: Millis = Date.now()): DemoSeed {
  startedAt = now
  const seed = createDemoSeed(now)
  const instance = new InMemoryRepository(toSnapshot(seed))
  repository = instance
  configureRepository(() => instance)
  return seed
}

/** The instant this demo run is anchored to. */
export function demoStartedAt(): Millis {
  return startedAt
}

/**
 * Restore the seeded dataset, discarding everything authored during the run.
 *
 * Synchronous on purpose - see InMemoryRepository.resetTo. Returns the fresh
 * seed so the caller can restore the notification inbox from the same value.
 */
export function resetDemoRepository(): DemoSeed {
  if (!repository) {
    throw new Error('resetDemoRepository was called before composeDemoRepository.')
  }
  const seed = createDemoSeed(startedAt)
  repository.resetTo(toSnapshot(seed))
  return seed
}

/**
 * Test seam: drop the composed instance so the next composeDemoRepository call
 * starts from nothing. Never called by product code.
 */
export function resetDemoRuntimeForTests(): void {
  repository = null
  startedAt = 0
}
