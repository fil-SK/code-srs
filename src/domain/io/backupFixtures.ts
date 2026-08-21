import type { Card, Deck, Draft, InteractionType, ReviewLog, Roadmap } from '@/types'
import { CARD_SCHEMA_VERSION, richText } from '@/types/card'
import { initialSchedulingState } from '@/domain/scheduling/state'

// Backup fixtures for the import/export tests, kept in a non-test module on
// purpose: tsconfig.app.json excludes *.test.ts from the typecheck, so a
// fixture written inline in a test file can drift from the real Card type
// without anything failing (src/data/backup.test.ts carried a deleted v1 card
// shape for exactly that reason). Here the compiler checks them.

export function fixtureDeck(overrides: Partial<Deck> = {}): Deck {
  return { id: 'deck-1', name: 'Operating Systems', createdAt: 1, updatedAt: 1, ...overrides }
}

// Both carry every optional field, so a test that wants "valid without the
// optionals" removes them explicitly rather than relying on a thin fixture.
export function fixtureDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'draft-1',
    rawText: 'Difference between a mutex and a spinlock?',
    code: { language: 'cpp', code: 'std::mutex m;' },
    intendedType: 'recall',
    intendedDeckId: 'deck-1',
    createdAt: 1,
    ...overrides,
  }
}

export function fixtureRoadmap(overrides: Partial<Roadmap> = {}): Roadmap {
  return {
    id: 'roadmap-1',
    title: 'Compilers',
    description: 'Front end to back end.',
    nodes: [
      { id: 'n1', deckId: 'deck-1', x: 0, y: 0 },
      { id: 'n2', deckId: 'deck-1', x: 220, y: 0 },
    ],
    edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

export function fixtureReviewLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: 'review-1',
    cardId: 'card-recall',
    reviewedAt: 1,
    rating: 3,
    autoGraded: false,
    durationMs: 1_000,
    stabilityBefore: 1,
    stabilityAfter: 2,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore: 'review',
    state: 'review',
    dueAfter: 2,
    ...overrides,
  }
}

const INTERACTIONS: { [T in InteractionType]: Extract<Card['interaction'], { type: T }> } = {
  recall: { type: 'recall', answer: richText('A process owns memory; a thread does not.') },
  multiple_choice: {
    type: 'multiple_choice',
    selectionMode: 'single',
    randomizeOptions: true,
    options: [
      { id: 'o1', content: richText('O(1)'), correct: true },
      { id: 'o2', content: richText('O(n)'), correct: false },
    ],
  },
  write_code: {
    type: 'write_code',
    language: 'python',
    starterCode: 'def add(a, b):\n    return ___',
    acceptedAnswers: ['a + b', 'b + a'],
    comparison: {
      trimOuterWhitespace: true,
      normalizeLineEndings: true,
      ignoreTrailingWhitespace: true,
      caseSensitive: false,
    },
  },
  ordering: {
    type: 'ordering',
    randomize: true,
    items: [
      { id: 'i1', content: richText('Lexical analysis') },
      { id: 'i2', content: richText('Parsing') },
    ],
    correctOrder: ['i1', 'i2'],
  },
  matching: {
    type: 'matching',
    columns: [
      {
        id: 'source',
        label: 'Container',
        fixed: false,
        items: [
          { id: 'r1', content: richText('std::unordered_map') },
          { id: 'r2', content: richText('std::map') },
        ],
      },
      {
        id: 'lookup',
        label: 'Average lookup',
        fixed: false,
        items: [
          { id: 'r1:lookup', content: richText('O(1)') },
          { id: 'r2:lookup', content: richText('O(log n)') },
        ],
      },
    ],
    relationships: [
      { source: 'r1', lookup: 'r1:lookup' },
      { source: 'r2', lookup: 'r2:lookup' },
    ],
  },
  walkthrough: {
    type: 'walkthrough',
    scenario: richText('Trace what `foo(3, 4)` returns.'),
    code: { language: 'cpp', value: 'int foo(int a, int b) {\n  return a + b;\n}' },
    steps: [
      {
        id: 's1',
        focus: [{ startLine: 2, endLine: 2 }],
        prompt: richText('What is returned?'),
        response: { type: 'recall', answer: richText('7') },
      },
    ],
  },
}

export function fixtureCard(
  type: InteractionType = 'recall',
  overrides: Partial<Card> = {},
): Card {
  return {
    id: `card-${type}`,
    schemaVersion: CARD_SCHEMA_VERSION,
    deckId: 'deck-1',
    prompt: richText('What is the difference between a process and a thread?'),
    interaction: INTERACTIONS[type],
    tags: ['os'],
    createdAt: 1,
    updatedAt: 1,
    suspended: false,
    scheduling: initialSchedulingState(1),
    ...overrides,
  }
}

export const ALL_INTERACTION_TYPES = Object.keys(INTERACTIONS) as InteractionType[]

// One card of every interaction type, all filed in fixtureDeck().
export function fixtureCards(): Card[] {
  return ALL_INTERACTION_TYPES.map((t) => fixtureCard(t))
}
