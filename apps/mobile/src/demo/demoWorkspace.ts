import {
  CARD_SCHEMA_VERSION,
  computeStreak,
  richText,
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

// The deterministic demo workspace: one dataset, mobile-only.
//
// This is an explicit marketing/demo mode, not production persistence and not a
// fake cloud. Nothing here is synced, cloud-backed or a persisted account, and
// no Repository is implemented - the shared Repository contract represents real
// persistence infrastructure and demo presentation state must not masquerade as
// one. Demo state lives for the life of the process and resets on a full app
// restart, which is deliberate: the purpose is an interactive demo,
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

export interface DemoCollection {
  id: ID
  name: string
  description: string
}

/**
 * Extends core's `Deck` so the demo list can be handed to the shared
 * `sortDecks` without a second comparator existing on this platform.
 */
export interface DemoDeck extends Deck {
  description: string
  /** `null` means unfiled - the deck belongs to no collection. */
  collectionId: ID | null
}

/**
 * A demo card is a real core `Card`, plus the one presentation field the deck
 * list shows beside it.
 *
 * It used to be a presentation record carrying `status` and `due` as authored
 * booleans. Those are gone: both are now derived from `scheduling` by
 * demoScheduling.ts, because grading produces a new `SchedulingState` and two
 * hand-maintained flags beside it would immediately contradict it.
 */
export interface DemoCard extends Card {
  tag: string
}

export interface DemoNotification {
  id: ID
  group: 'today' | 'earlier'
  kind: 'session' | 'deck' | 'streak' | 'retention' | 'warning' | 'import' | 'cards'
  title: string
  body: string
  timeLabel: string
  unread: boolean
  deckMark?: string
  /** Present only when an existing demo deck is an honest destination. */
  deckId?: ID
}

export interface DemoWorkspace {
  collections: DemoCollection[]
  decks: DemoDeck[]
  cards: DemoCard[]
  notifications: DemoNotification[]
  /**
   * Seeded history plus reviews performed in the current run, all in core's
   * canonical shape. In memory only - never written to Dexie, SQLite or
   * Supabase, and gone on a full app restart.
   */
  reviewLogs: ReviewLog[]
  /** The instant this workspace was built, which every demo due date is relative to. */
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
 * The Library scope rail, in the order the designed screen presents it. Authored
 * as data rather than derived so the two synthetic scopes ("All Decks" and
 * "Unfiled") keep their designed positions among the real collections; the
 * screen still resolves every entry by lookup, never by branching on an id.
 */
export const DEMO_SCOPE_RAIL: (ID | 'all' | 'unfiled')[] = [
  'all',
  'fixture-interview-core',
  'fixture-languages-cpp',
  'unfiled',
  'fixture-systems',
  'fixture-research',
]

const collections: DemoCollection[] = [
  {
    id: 'fixture-interview-core',
    name: 'Interview Core',
    description: 'Reusable reasoning patterns for coding and systems interviews.',
  },
  {
    id: 'fixture-languages-cpp',
    name: 'Languages & C++',
    description: 'Durable knowledge across modern C++, compilers, and language implementation.',
  },
  {
    id: 'fixture-systems',
    name: 'Systems',
    description: 'How real systems are built, connected, and kept running.',
  },
  {
    id: 'fixture-research',
    name: 'Research',
    description: 'Papers worth remembering, distilled into recallable claims.',
  },
]

const decks: DemoDeck[] = [
  {
    id: 'fixture-algorithms',
    name: 'Algorithms & Problem Solving',
    description: 'Invariants, data structures, graph reasoning, and more',
    collectionId: 'fixture-interview-core',
    createdAt: DEMO_EPOCH - 90 * DAY_MS,
    updatedAt: DEMO_EPOCH - 4 * DAY_MS,
  },
  {
    id: 'fixture-leetcode-patterns',
    name: 'LeetCode Patterns',
    description: 'Common patterns and problem-solving techniques',
    collectionId: 'fixture-interview-core',
    createdAt: DEMO_EPOCH - 20 * DAY_MS,
    updatedAt: DEMO_EPOCH - 20 * DAY_MS,
  },
  {
    id: 'fixture-compilers',
    name: 'Compilers & MLIR',
    description: 'Transferable compiler concepts from theory to IR',
    collectionId: 'fixture-languages-cpp',
    createdAt: DEMO_EPOCH - 120 * DAY_MS,
    updatedAt: DEMO_EPOCH - 1 * DAY_MS,
  },
  {
    id: 'fixture-modern-cpp',
    name: 'Modern C++ & Memory',
    description: 'Values, lifetime, ownership, and performance',
    collectionId: 'fixture-languages-cpp',
    createdAt: DEMO_EPOCH - 150 * DAY_MS,
    updatedAt: DEMO_EPOCH - 2 * DAY_MS,
  },
  {
    id: 'fixture-distributed-systems',
    name: 'Systems & Distributed Systems',
    description: 'Concurrency, storage, networking, and scaling',
    collectionId: 'fixture-systems',
    createdAt: DEMO_EPOCH - 45 * DAY_MS,
    updatedAt: DEMO_EPOCH - 45 * DAY_MS,
  },
  {
    id: 'fixture-computer-networks',
    name: 'Computer Networks',
    description: 'Network layers, routing, TCP/IP, and protocols',
    collectionId: 'fixture-systems',
    createdAt: DEMO_EPOCH - 1 * DAY_MS,
    updatedAt: DEMO_EPOCH - 1 * DAY_MS,
  },
  {
    id: 'fixture-compiler-papers',
    name: 'Compiler Research Papers',
    description: 'Key papers on compiler design and optimizations',
    collectionId: 'fixture-research',
    createdAt: DEMO_EPOCH - 30 * DAY_MS,
    updatedAt: DEMO_EPOCH - 30 * DAY_MS,
  },
  {
    id: 'fixture-security-engineering',
    name: 'Security Engineering',
    description: 'Security concepts, threat models, and best practices',
    collectionId: null,
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
function createCards(now: Millis): DemoCard[] {
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
    tag: seed.tag,
  }))
}

function dueCountFor(cards: DemoCard[], deckId: ID, now: Millis): number {
  return cards.filter((card) => card.deckId === deckId && isDemoCardDue(card, now)).length
}

function cardCountFor(cards: DemoCard[], deckId: ID): number {
  return cards.filter((card) => card.deckId === deckId).length
}

// Notification copy is built from the same counts the screens show, so an inbox
// cannot claim a deck has five cards due while the deck itself says three.
function createNotifications(
  cards: DemoCard[],
  reviewLogs: ReviewLog[],
  now: Millis,
): DemoNotification[] {
  const dueTotal = cards.filter((card) => isDemoCardDue(card, now)).length
  const streak = computeStreak(reviewLogs, now).current
  // The same trailing-30-day window Today shows, so the inbox cannot quote a
  // retention figure the dashboard disagrees with.
  const retention = demoTodayRetention(reviewLogs, now)
  const retentionPercent = retention === null ? null : Math.round(retention * 100)
  const interviewCoreCards = decks
    .filter((deck) => deck.collectionId === 'fixture-interview-core')
    .reduce((total, deck) => total + cardCountFor(cards, deck.id), 0)

  return [
    {
      id: 'fixture-session-ready',
      group: 'today',
      kind: 'session',
      title: "Today's session is ready",
      body: `You have ${dueTotal} cards due for review. Keep up your momentum!`,
      timeLabel: '10m ago',
      unread: true,
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
      deckId: 'fixture-modern-cpp',
    },
    {
      id: 'fixture-streak',
      group: 'today',
      kind: 'streak',
      title: `${streak}-day streak unlocked`,
      body: `Amazing! You've kept your streak alive for ${streak} days.`,
      timeLabel: '1h ago',
      unread: true,
    },
    {
      id: 'fixture-retention',
      group: 'today',
      kind: 'retention',
      title: retentionPercent === null ? 'Retention is taking shape' : `Retention is ${retentionPercent}%`,
      body: 'Great job! Mature reviews are building a meaningful signal.',
      timeLabel: '2h ago',
      unread: false,
    },
    {
      id: 'fixture-algorithms-due',
      group: 'today',
      kind: 'warning',
      title: 'Algorithms & Problem Solving is falling behind',
      body: `You have ${dueCountFor(cards, 'fixture-algorithms', now)} cards due. A quick review will keep you on track.`,
      timeLabel: '4h ago',
      unread: true,
      deckId: 'fixture-algorithms',
    },
    {
      id: 'fixture-import',
      group: 'earlier',
      kind: 'import',
      title: 'Deck import completed',
      body: '"Computer Networks" was imported into Systems. It has no cards yet.',
      timeLabel: 'Yesterday, 6:30 PM',
      unread: false,
      deckId: 'fixture-computer-networks',
    },
    {
      id: 'fixture-new-cards',
      group: 'earlier',
      kind: 'cards',
      title: 'New cards added',
      body: `${interviewCoreCards} new cards were added to "Interview Core".`,
      timeLabel: 'Yesterday, 2:15 PM',
      unread: true,
    },
  ]
}

/**
 * A fresh copy of the demo workspace. Called once by the provider; the returned
 * value is the only mutable demo state in the app.
 *
 * `now` is a parameter rather than an implicit `Date.now()` at each use site so
 * one instant anchors the whole dataset: every card's due date, the notification
 * counts derived from them, and the queue a session builds all agree. Tests pass
 * a fixed instant; the app passes the real clock once, at startup.
 */
export function createDemoWorkspace(now: Millis = Date.now()): DemoWorkspace {
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
    collections: collections.map((collection) => ({ ...collection })),
    decks: decks.map((deck) => ({ ...deck })),
    cards,
    notifications: createNotifications(cards, history.logs, now),
    reviewLogs: history.logs,
    startedAt: now,
  }
}
