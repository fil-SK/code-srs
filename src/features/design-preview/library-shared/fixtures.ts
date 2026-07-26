import type { ID, Millis } from '@/types/common'
import type { InteractionType } from '@/types/cardV2'
import type { SchedulingStateKind } from '@/types/review'

// Preview-only stand-ins for the Library feature (docs/itera-redesign-plan.md
// Phase H). `Collection` doesn't exist as a real type yet — it will be
// *derived* from existing Deck.parentId structure by an explicit migration
// (docs/itera-decisions.md D8), not authored fresh. These types are
// deliberately named Library* (not Collection/Deck/Card) so they can't be
// mistaken for, or accidentally collide with, the real types in
// src/types/deck.ts and src/types/card.ts. Shape here is invented for this
// visual check only — it is NOT a proposal for the real Collection/CardState
// fields; do not copy it verbatim into Phase G/H implementation.

const DAY = 24 * 60 * 60 * 1000

export interface LibraryCollection {
  id: ID
  name: string
  parentId?: ID
}

export interface LibraryDeck {
  id: ID
  name: string
  description?: string
  collectionId?: ID // undefined = Unfiled
  cardCount: number
  dueCount: number
  lastStudied?: Millis // undefined = never studied
  mastery: number // 0-1, illustrative — no real mastery concept exists yet
  markLabel: string // 1-3 chars shown on the square deck mark
}

export interface LibraryCard {
  id: ID
  deckId: ID
  interaction: InteractionType
  title: string
  tags: string[]
  state: SchedulingStateKind
  suspended: boolean
  due?: Millis // undefined for new/unscheduled cards
}

const now = Date.now()

export const libraryCollections: LibraryCollection[] = [
  { id: 'col-cpp', name: 'C++' },
  { id: 'col-cpp-fundamentals', name: 'Fundamentals', parentId: 'col-cpp' },
  { id: 'col-cpp-templates', name: 'Templates', parentId: 'col-cpp' },
  { id: 'col-cpp-stl', name: 'STL', parentId: 'col-cpp' },
  { id: 'col-cpp-memory', name: 'Memory', parentId: 'col-cpp' },
  { id: 'col-cpp-concurrency', name: 'Concurrency', parentId: 'col-cpp' },
  { id: 'col-compilers', name: 'Compilers' },
  { id: 'col-system-design', name: 'System Design' },
  { id: 'col-algorithms', name: 'Algorithms' },
  { id: 'col-databases', name: 'Databases' },
  // Deliberately empty — exercises the "empty collection" state.
  { id: 'col-networking', name: 'Networking' },
]

export const libraryDecks: LibraryDeck[] = [
  {
    id: 'deck-declarations',
    name: 'Declarations and Definitions',
    description: 'Understand how names are introduced and defined in C++.',
    collectionId: 'col-cpp-fundamentals',
    cardCount: 48,
    dueCount: 23,
    lastStudied: now - 2 * 60 * 60 * 1000,
    mastery: 0.68,
    markLabel: 'C++',
  },
  {
    id: 'deck-type-deduction',
    name: 'Type Deduction and auto',
    description: 'auto, decltype, and template argument deduction rules.',
    collectionId: 'col-cpp-fundamentals',
    cardCount: 31,
    dueCount: 6,
    lastStudied: now - 1 * DAY,
    mastery: 0.54,
    markLabel: 'C++',
  },
  {
    id: 'deck-variadic-templates',
    name: 'Variadic Templates',
    description: 'Parameter packs, fold expressions, and recursive expansion.',
    collectionId: 'col-cpp-templates',
    cardCount: 22,
    dueCount: 0,
    lastStudied: now - 6 * DAY,
    mastery: 0.41,
    markLabel: 'C++',
  },
  {
    id: 'deck-smart-pointers',
    name: 'Smart Pointers',
    description: 'unique_ptr, shared_ptr, and ownership semantics.',
    collectionId: 'col-cpp-memory',
    cardCount: 27,
    dueCount: 9,
    lastStudied: now - 3 * DAY,
    mastery: 0.72,
    markLabel: 'C++',
  },
  {
    id: 'deck-atomics',
    name: 'Atomics and Memory Order',
    description: 'Lock-free basics and the C++ memory model.',
    collectionId: 'col-cpp-concurrency',
    cardCount: 14,
    dueCount: 14,
    mastery: 0.12,
    markLabel: 'C++',
  },
  {
    id: 'deck-parsing',
    name: 'Parsing and Grammars',
    description: 'Recursive descent, precedence climbing, LL vs LR.',
    collectionId: 'col-compilers',
    cardCount: 19,
    dueCount: 4,
    lastStudied: now - 2 * DAY,
    mastery: 0.58,
    markLabel: 'CO',
  },
  {
    id: 'deck-codegen',
    name: 'Instruction Selection',
    description: 'Lowering IR to machine instructions.',
    collectionId: 'col-compilers',
    cardCount: 16,
    dueCount: 0,
    lastStudied: now - 10 * DAY,
    mastery: 0.35,
    markLabel: 'CO',
  },
  {
    id: 'deck-caching',
    name: 'Caching and Consistency',
    description: 'Cache invalidation strategies and consistency models.',
    collectionId: 'col-system-design',
    cardCount: 21,
    dueCount: 3,
    lastStudied: now - 4 * DAY,
    mastery: 0.63,
    markLabel: 'SD',
  },
  {
    id: 'deck-graph-algos',
    name: 'Graph Algorithms',
    description: 'Shortest paths, MSTs, and traversal strategies.',
    collectionId: 'col-algorithms',
    cardCount: 33,
    dueCount: 11,
    lastStudied: now - 1 * DAY,
    mastery: 0.47,
    markLabel: 'AL',
  },
  {
    id: 'deck-indexing',
    name: 'Indexing and Query Plans',
    description: 'B-trees, hash indexes, and how planners pick them.',
    collectionId: 'col-databases',
    cardCount: 8,
    dueCount: 0,
    mastery: 0,
    markLabel: 'DB',
  },
  // Unfiled — no collectionId.
  {
    id: 'deck-misc-trivia',
    name: 'Odds and Ends',
    description: 'A grab bag of cards not yet sorted into a collection.',
    cardCount: 6,
    dueCount: 2,
    lastStudied: now - 14 * DAY,
    mastery: 0.3,
    markLabel: 'OE',
  },
  {
    id: 'deck-empty',
    name: 'Interview Warmup',
    description: '',
    cardCount: 0,
    dueCount: 0,
    mastery: 0,
    markLabel: 'IW',
  },
]

const TYPES: InteractionType[] = [
  'recall',
  'multiple_choice',
  'write_code',
  'ordering',
  'matching',
  'walkthrough',
]

const STATES: SchedulingStateKind[] = ['new', 'learning', 'review', 'relearning']

function cardsForDeck(deck: LibraryDeck): LibraryCard[] {
  if (deck.cardCount === 0) return []
  const sample = Math.min(deck.cardCount, 6)
  const titles = [
    'What is a declaration?',
    'Which statements are declarations?',
    'Define vs declare',
    'Order: translation phases',
    'Match keyword to meaning',
    'Walkthrough: variable lifetime',
  ]
  return Array.from({ length: sample }, (_, i) => ({
    id: `${deck.id}-card-${i}`,
    deckId: deck.id,
    interaction: TYPES[i % TYPES.length],
    title: titles[i % titles.length],
    tags: i % 2 === 0 ? ['basics', 'declaration'] : ['keywords'],
    state: STATES[i % STATES.length],
    suspended: i === sample - 1 && deck.id === 'deck-declarations',
    due: i % 4 === 1 ? undefined : now + (i - 2) * DAY,
  }))
}

export const libraryCards: LibraryCard[] = libraryDecks.flatMap(cardsForDeck)
