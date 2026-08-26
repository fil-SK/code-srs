import {
  CARD_SCHEMA_VERSION,
  computeStreak,
  formatEventDate,
  richText,
  startOfDay,
  type Card,
  type Deck,
  type ID,
  type Millis,
  type ReviewLog,
} from '@itera/core'

import { DEMO_CARD_SEEDS } from './demoCardContent'
import { createDemoReviewHistory, demoTodayRetention } from './demoReviewHistory'
import { isDemoCardDue, resolveDemoScheduling } from './demoScheduling'
import type { MobileCardStatus } from '@/src/types/library'

// The deterministic demo seed: one dataset, mobile-only.
//
// This file authors the dataset and nothing else. It holds no mutable state:
// `createDemoSeed` returns a fresh set of canonical entities, and the
// InMemoryRepository registered in src/data/ is what owns them from then on
// (see demoRuntime.ts). Earlier milestones kept the workspace itself mutable
// and deliberately refused to implement `Repository`, on the grounds that demo
// presentation state must not masquerade as persistence infrastructure. That
// reasoning held while the demo was read-only; it stopped holding once decks
// and cards had to be authored on the phone, because the shared hooks that own
// authoring reach storage only through that contract. The demo backend is now
// an honest, complete Repository implementation that happens to be in memory -
// which is a different claim from pretending memory is persistence.
//
// This is still an explicit marketing/demo mode, not production persistence and
// not a fake cloud. Nothing here is synced, cloud-backed or a persisted
// account. Demo state lives for the life of the process and resets on a full
// app restart, which is deliberate: the purpose is an interactive demo,
// deterministic screenshots and physical-device UI testing.
//
// It exists because every screen used to manufacture its own fixture snapshot,
// so the same deck had three different ids (fixture-distributed-systems in
// Library, fixture-systems in Today - which was also a collection id - and
// fixture-systems-distributed in Progress) and four different card counts. Here
// an id refers to one entity and every screen reads the same record.
//
// Every learning metric is derived from canonical Cards + ReviewLogs through
// @itera/core. Authored values in this file are seed inputs only.

// One definition, shared with the presentation contract the deck list renders.
export type DemoCardStatus = MobileCardStatus
export type DemoInteractionType = Card['interaction']['type']

// There is no demo Collection type, and no demo Deck or Card type.
//
// A Collection is not an entity anywhere in Itera: core derives it from the
// `Deck.parentId` tree (`library/collectionTree.ts` - any deck with at least
// one child deck is a Collection, and a collection id *is* a deck id). This
// file used to carry a parallel `DemoCollection[]` plus `DemoDeck.collectionId`,
// which was a second, mobile-only source of hierarchy truth: no shared hook
// could write it, a deck authored through `useCreateDeck({parentId})` would
// have been invisible to it, and a backup exported from the phone would have
// imported into web as flat top-level decks with every collection silently
// lost. The four demo collections are now ordinary `Deck` rows that happen to
// have children, exactly as they would be on web.
//
// Likewise the cards are plain core `Card`s. The deck list's tag label reads
// `card.tags[0]`, which is where the authored tag already lived.

/**
 * Where a notification row goes when it is opened.
 *
 * Authored per notification rather than inferred from `kind`, because the two
 * are not the same question: two rows can share a kind and belong in different
 * places, and a row is allowed to have no destination at all. Every destination
 * names a surface that exists on this platform, so a row can never promise
 * navigation the app cannot perform.
 */
export type DemoNotificationDestination =
  | { kind: 'deck'; deckId: ID }
  | { kind: 'collection'; collectionId: ID }
  | { kind: 'review' }
  | { kind: 'progress' }

export interface DemoNotification {
  id: ID
  group: 'today' | 'earlier'
  kind: 'session' | 'deck' | 'streak' | 'retention' | 'warning' | 'import' | 'cards'
  title: string
  body: string
  timeLabel: string
  unread: boolean
  deckMark?: string
  /**
   * Omitted only when nothing in the app answers the notification. Such a row
   * marks itself read and says so; it never implies a destination.
   */
  destination?: DemoNotificationDestination
}

/**
 * The deterministic starting state of a demo run.
 *
 * Not a store and not a workspace: a plain value handed to the InMemoryRepository
 * at composition and again at reset. `decks` and `cards` are canonical core
 * entities, so everything above the repository seam - the shared hooks, the
 * shared selectors, `collectionTree`, `sortDecks` - reads them without knowing
 * this file exists.
 */
export interface DemoSeed {
  decks: Deck[]
  cards: Card[]
  /**
   * Seeded history in core's canonical shape. Held in memory only - never
   * written to Dexie, SQLite or Supabase, and gone on a full app restart.
   */
  reviewLogs: ReviewLog[]
  /**
   * The inbox. Notifications are the one demo concept with no Repository store,
   * so they stay outside it (see DemoWorkspaceProvider).
   */
  notifications: DemoNotification[]
  /** The instant this seed was built, which every demo due date is relative to. */
  startedAt: Millis
}

// Entity authoring dates are stable fixture metadata. Learning-history dates
// are deliberately relative to the real local day in demoReviewHistory.ts.
const DEMO_EPOCH = Date.UTC(2026, 7, 24)
const DAY_MS = 86_400_000

// The same six labels the web card toolbar uses. Derived per card rather than
// authored on each one, so a label cannot drift from its interaction type.
export const DEMO_INTERACTION_LABELS: Record<DemoInteractionType, string> = {
  recall: 'Recall',
  multiple_choice: 'Multiple Choice',
  write_code: 'Write Code',
  ordering: 'Ordering',
  matching: 'Matching',
  walkthrough: 'Walkthrough',
}

/**
 * The Library scope rail, in the order the designed screen presents it.
 *
 * This is presentation order and nothing else - it carries no hierarchy truth.
 * Which decks belong to which collection comes from `Deck.parentId` through
 * core's `collectionTree`; this list only says where the designed screen puts
 * the two synthetic scopes ("All Decks" and "Unfiled") among the real ones. A
 * collection that exists in the deck tree but is absent here still appears, at
 * the end - which is what lets a deck authored later create a collection the
 * rail has never heard of (see demoSelectors' `demoScopeRail`).
 */
export const DEMO_COLLECTION_RAIL: (ID | 'all' | 'unfiled')[] = [
  'all',
  'fixture-interview-core',
  'fixture-languages-cpp',
  'unfiled',
  'fixture-systems',
  'fixture-research',
]

// The four collections, as ordinary Decks. Each has children (below), which is
// precisely what makes core's `deriveCollections` classify it as a Collection.
// A collection deck carries no cards of its own in this fixture.
const collectionDecks: Deck[] = [
  {
    id: 'fixture-interview-core',
    name: 'Interview Core',
    description: 'Reusable reasoning patterns for coding and systems interviews.',
    createdAt: DEMO_EPOCH - 91 * DAY_MS,
    updatedAt: DEMO_EPOCH - 4 * DAY_MS,
  },
  {
    id: 'fixture-languages-cpp',
    name: 'Languages & C++',
    description: 'Durable knowledge across modern C++, compilers, and language implementation.',
    createdAt: DEMO_EPOCH - 151 * DAY_MS,
    updatedAt: DEMO_EPOCH - 1 * DAY_MS,
  },
  {
    id: 'fixture-systems',
    name: 'Systems',
    description: 'How real systems are built, connected, and kept running.',
    createdAt: DEMO_EPOCH - 46 * DAY_MS,
    updatedAt: DEMO_EPOCH - 1 * DAY_MS,
  },
  {
    id: 'fixture-research',
    name: 'Research',
    description: 'Papers worth remembering, distilled into recallable claims.',
    createdAt: DEMO_EPOCH - 31 * DAY_MS,
    updatedAt: DEMO_EPOCH - 30 * DAY_MS,
  },
]

// The browsable decks. `parentId` is the only relationship field: a deck with
// no parent is Unfiled, exactly as on web.
const leafDecks: Deck[] = [
  {
    id: 'fixture-algorithms',
    name: 'Algorithms & Problem Solving',
    description: 'Invariants, data structures, graph reasoning, and more',
    parentId: 'fixture-interview-core',
    createdAt: DEMO_EPOCH - 90 * DAY_MS,
    updatedAt: DEMO_EPOCH - 4 * DAY_MS,
  },
  {
    id: 'fixture-leetcode-patterns',
    name: 'LeetCode Patterns',
    description: 'Common patterns and problem-solving techniques',
    parentId: 'fixture-interview-core',
    createdAt: DEMO_EPOCH - 20 * DAY_MS,
    updatedAt: DEMO_EPOCH - 20 * DAY_MS,
  },
  {
    id: 'fixture-compilers',
    name: 'Compilers & MLIR',
    description: 'Transferable compiler concepts from theory to IR',
    parentId: 'fixture-languages-cpp',
    createdAt: DEMO_EPOCH - 120 * DAY_MS,
    updatedAt: DEMO_EPOCH - 1 * DAY_MS,
  },
  {
    id: 'fixture-modern-cpp',
    name: 'Modern C++ & Memory',
    description: 'Values, lifetime, ownership, and performance',
    parentId: 'fixture-languages-cpp',
    createdAt: DEMO_EPOCH - 150 * DAY_MS,
    updatedAt: DEMO_EPOCH - 2 * DAY_MS,
  },
  {
    id: 'fixture-distributed-systems',
    name: 'Systems & Distributed Systems',
    description: 'Concurrency, storage, networking, and scaling',
    parentId: 'fixture-systems',
    createdAt: DEMO_EPOCH - 45 * DAY_MS,
    updatedAt: DEMO_EPOCH - 45 * DAY_MS,
  },
  {
    id: 'fixture-computer-networks',
    name: 'Computer Networks',
    description: 'Network layers, routing, TCP/IP, and protocols',
    parentId: 'fixture-systems',
    createdAt: DEMO_EPOCH - 1 * DAY_MS,
    updatedAt: DEMO_EPOCH - 1 * DAY_MS,
  },
  {
    id: 'fixture-compiler-papers',
    name: 'Compiler Research Papers',
    description: 'Key papers on compiler design and optimizations',
    parentId: 'fixture-research',
    createdAt: DEMO_EPOCH - 30 * DAY_MS,
    updatedAt: DEMO_EPOCH - 30 * DAY_MS,
  },
  {
    id: 'fixture-security-engineering',
    name: 'Security Engineering',
    description: 'Security concepts, threat models, and best practices',
    createdAt: DEMO_EPOCH - 60 * DAY_MS,
    updatedAt: DEMO_EPOCH - 60 * DAY_MS,
  },
]

// Three decks carry cards. The other five are honestly empty and say so - a
// deck with no cards is a real state of the product, and inventing content for
// eight decks would expand the dataset well past what a demo needs.
//
// The content itself lives in demoCardContent.ts; this turns each authored seed
// into a real core Card against the workspace's own `now`.
function createCards(now: Millis): Card[] {
  return DEMO_CARD_SEEDS.map((seed) => ({
    id: seed.id,
    schemaVersion: CARD_SCHEMA_VERSION,
    deckId: seed.deckId,
    prompt: richText(seed.prompt),
    tip: seed.tip === undefined ? undefined : richText(seed.tip),
    explanation: seed.explanation === undefined ? undefined : richText(seed.explanation),
    interaction: seed.interaction,
    tags: [seed.tag],
    createdAt: DEMO_EPOCH - seed.createdDaysAgo * DAY_MS,
    updatedAt: DEMO_EPOCH - seed.createdDaysAgo * DAY_MS,
    suspended: false,
    scheduling: resolveDemoScheduling(seed.scheduling, now),
  }))
}

/**
 * A fixture instant, read on the learner's timeline.
 *
 * Entity dates are authored against the fixed DEMO_EPOCH, while everything the
 * learner actually did is replayed relative to the current local day. Anything
 * shown to the learner has to be read the second way, or a demo recorded three
 * months from now would show an inbox dated last August. This converts an
 * authored instant into the same age measured back from the workspace's own
 * anchor, then formats it with core's one event formatter.
 */
function fixtureDateLabel(authored: Millis, now: Millis): string {
  return formatEventDate(now - (DEMO_EPOCH - authored), now)
}

function dueCountFor(cards: Card[], deckId: ID, now: Millis): number {
  return cards.filter((card) => card.deckId === deckId && isDemoCardDue(card, now)).length
}

// Notification copy is built from the same counts the screens show, so an inbox
// cannot claim a deck has five cards due while the deck itself says three.
function createNotifications(
  cards: Card[],
  reviewLogs: ReviewLog[],
  now: Millis,
): DemoNotification[] {
  const dueTotal = cards.filter((card) => isDemoCardDue(card, now)).length
  const streak = computeStreak(reviewLogs, now).current
  // The same trailing-30-day window Today shows, so the inbox cannot quote a
  // retention figure the dashboard disagrees with.
  const retention = demoTodayRetention(reviewLogs, now)
  const retentionPercent = retention === null ? null : Math.round(retention * 100)
  // "New cards added" used to count every card in the collection and call all
  // of them new, which contradicted the cards themselves: the six Interview
  // Core cards were authored between 8 and 88 days before the anchor, and none
  // of them was added on the day the row claimed. Both the count and the date
  // now come from the cards that were actually added most recently, so the row
  // can only ever describe something that happened.
  const interviewCoreDeckIds = new Set(
    leafDecks.filter((deck) => deck.parentId === 'fixture-interview-core').map((deck) => deck.id),
  )
  const interviewCoreCards = cards.filter((card) => interviewCoreDeckIds.has(card.deckId))
  const latestAddedAt = Math.max(...interviewCoreCards.map((card) => card.createdAt))
  const latestAdded = interviewCoreCards.filter(
    (card) => startOfDay(card.createdAt) === startOfDay(latestAddedAt),
  ).length

  return [
    {
      id: 'fixture-session-ready',
      group: 'today',
      kind: 'session',
      title: "Today's session is ready",
      body: `You have ${dueTotal} cards due for review. Keep up your momentum!`,
      timeLabel: '10m ago',
      unread: true,
      destination: { kind: 'review' },
    },
    {
      id: 'fixture-modern-cpp-due',
      group: 'today',
      kind: 'deck',
      title: `Modern C++ & Memory has ${dueCountFor(cards, 'fixture-modern-cpp', now)} cards due`,
      body: 'Review to strengthen your retention.',
      timeLabel: '25m ago',
      unread: true,
      deckMark: 'MC',
      destination: { kind: 'deck', deckId: 'fixture-modern-cpp' },
    },
    {
      id: 'fixture-streak',
      group: 'today',
      kind: 'streak',
      title: `${streak}-day streak unlocked`,
      body: `Amazing! You've kept your streak alive for ${streak} days.`,
      timeLabel: '1h ago',
      unread: true,
      destination: { kind: 'progress' },
    },
    {
      id: 'fixture-retention',
      group: 'today',
      kind: 'retention',
      title: retentionPercent === null ? 'Retention is taking shape' : `Retention is ${retentionPercent}%`,
      body: 'Great job! Mature reviews are building a meaningful signal.',
      timeLabel: '2h ago',
      unread: false,
      destination: { kind: 'progress' },
    },
    {
      id: 'fixture-algorithms-due',
      group: 'today',
      kind: 'warning',
      title: 'Algorithms & Problem Solving is falling behind',
      body: `You have ${dueCountFor(cards, 'fixture-algorithms', now)} cards due. A quick review will keep you on track.`,
      timeLabel: '4h ago',
      unread: true,
      destination: { kind: 'deck', deckId: 'fixture-algorithms' },
    },
    {
      id: 'fixture-import',
      group: 'earlier',
      kind: 'import',
      title: 'Deck import completed',
      body: '"Computer Networks" was imported into Systems. It has no cards yet.',
      // Taken from the deck's own createdAt rather than authored, so the row
      // cannot drift into claiming an import that predates the deck.
      timeLabel: fixtureDateLabel(
        leafDecks.find((deck) => deck.id === 'fixture-computer-networks')?.createdAt ?? DEMO_EPOCH,
        now,
      ),
      unread: false,
      destination: { kind: 'deck', deckId: 'fixture-computer-networks' },
    },
    {
      id: 'fixture-new-cards',
      group: 'earlier',
      kind: 'cards',
      title: latestAdded === 1 ? 'New card added' : 'New cards added',
      body: `${latestAdded} new ${latestAdded === 1 ? 'card was' : 'cards were'} added to "Interview Core".`,
      timeLabel: fixtureDateLabel(latestAddedAt, now),
      unread: true,
      destination: { kind: 'collection', collectionId: 'fixture-interview-core' },
    },
  ]
}

/**
 * A fresh copy of the deterministic demo dataset.
 *
 * `now` is a parameter rather than an implicit `Date.now()` at each use site so
 * one instant anchors the whole dataset: every card's due date, the notification
 * counts derived from them, and the queue a session builds all agree. Tests pass
 * a fixed instant; the app passes the real clock once, at startup, and reset
 * passes that same recorded instant back so a reset reproduces byte-identical
 * state rather than drifting with the wall clock (D417).
 */
export function createDemoSeed(now: Millis = Date.now()): DemoSeed {
  // Cards start in the authored "new" state, the history is replayed over them
  // through the shared scheduler, and each reviewed card then *takes* the state
  // that replay left it in. A card's current scheduling is therefore the result
  // of its own last seeded review rather than a second, independently authored
  // claim about it - see demoReviewHistory.ts.
  const newCards = createCards(now)
  const history = createDemoReviewHistory(now, newCards)
  const cards = newCards.map((card) => {
    const reviewed = history.scheduling.get(card.id)
    return reviewed === undefined ? card : { ...card, scheduling: reviewed }
  })

  return {
    // Collections first is presentation-irrelevant - every consumer resolves by
    // id or through collectionTree - but it keeps the seed readable.
    decks: [...collectionDecks, ...leafDecks].map((deck) => ({ ...deck })),
    cards,
    notifications: createNotifications(cards, history.logs, now),
    reviewLogs: history.logs,
    startedAt: now,
  }
}
