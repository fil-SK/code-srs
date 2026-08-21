import type {
  Card,
  Deck,
  ID,
  InteractionType,
  ReviewLog,
  SchedulingState,
} from '@/types'
import { CARD_SCHEMA_VERSION } from '@/types/card'

// Structural validation for the entities inside a backup file, run by
// parseBackup before anything is handed to the import layer.
//
// Deliberately hand-written and dependency-free: this is a guard against
// obviously invalid hand-authored or LLM-generated JSON (see
// docs/prompts/ai-card-prompt.md), not a general schema framework. It checks
// that the fields the app actually reads are present and of the right basic
// kind, and stops at container shape inside an interaction payload.
//
// The two lookup tables below are typed so the compiler fails the build when a
// scheduling field or a seventh interaction type is added without being
// classified here - the same "compiler-enforced touchpoint" idea the interaction
// checklist in docs/architecture.md uses.

const INTERACTION_TYPES = [
  'recall',
  'multiple_choice',
  'write_code',
  'ordering',
  'matching',
  'walkthrough',
] as const

const SCHEDULING_STATE_KINDS = ['new', 'learning', 'review', 'relearning'] as const

type FieldKind = 'number' | 'optionalNumber' | 'stateKind'

// Keyed by `Required<SchedulingState>` so an added field must be classified.
const SCHEDULING_FIELDS: Record<keyof Required<SchedulingState>, FieldKind> = {
  due: 'number',
  stability: 'number',
  difficulty: 'number',
  elapsedDays: 'number',
  scheduledDays: 'number',
  reps: 'number',
  lapses: 'number',
  learningSteps: 'number',
  state: 'stateKind',
  lastReview: 'optionalNumber',
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

// Numbers only, and only real ones: NaN/Infinity would reach the FSRS adapter
// and the due index as if they were valid.
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

// { format: 'markdown', value: string } — every prose field on a Card.
function isRichContent(value: unknown): boolean {
  return isObject(value) && value.format === 'markdown' && typeof value.value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

function fail(what: string, index: number, id: unknown, problem: string): never {
  const label = isNonEmptyString(id) ? `${what} ${index + 1} ("${id}")` : `${what} ${index + 1}`
  throw new Error(`${label} ${problem}`)
}

// ---- Deck ----

export function assertValidDecks(decks: unknown[]): asserts decks is Deck[] {
  decks.forEach((raw, i) => {
    if (!isObject(raw)) fail('Deck', i, undefined, 'is not an object.')
    const id = raw.id
    if (!isNonEmptyString(id)) fail('Deck', i, id, 'is missing a valid "id".')
    if (typeof raw.name !== 'string') fail('Deck', i, id, 'is missing a valid "name".')
    if (!isFiniteNumber(raw.createdAt) || !isFiniteNumber(raw.updatedAt)) {
      fail('Deck', i, id, 'needs numeric "createdAt" and "updatedAt" timestamps.')
    }
    for (const key of ['parentId', 'description', 'language'] as const) {
      if (raw[key] !== undefined && typeof raw[key] !== 'string') {
        fail('Deck', i, id, `has a "${key}" that is not a string.`)
      }
    }
  })
}

// ---- Scheduling ----

function assertValidScheduling(index: number, id: unknown, raw: unknown): void {
  if (!isObject(raw)) {
    fail('Card', index, id, 'is missing its "scheduling" block.')
  }
  for (const [field, kind] of Object.entries(SCHEDULING_FIELDS)) {
    const value = raw[field]
    if (kind === 'optionalNumber') {
      if (value !== undefined && !isFiniteNumber(value)) {
        fail('Card', index, id, `has a "scheduling.${field}" that is not a number.`)
      }
      continue
    }
    if (kind === 'stateKind') {
      if (!SCHEDULING_STATE_KINDS.includes(value as (typeof SCHEDULING_STATE_KINDS)[number])) {
        fail(
          'Card',
          index,
          id,
          `has an invalid "scheduling.${field}". Expected one of: ` +
            `${SCHEDULING_STATE_KINDS.join(', ')}.`,
        )
      }
      continue
    }
    if (!isFiniteNumber(value)) {
      fail('Card', index, id, `is missing a numeric "scheduling.${field}".`)
    }
  }
}

// ---- Interaction payloads ----

// Container-shape only. Grading and the review views tolerate empty strings and
// odd content, but they do assume these fields exist and are the right kind.
const INTERACTION_CHECKS: Record<
  InteractionType,
  (i: Record<string, unknown>) => string | undefined
> = {
  recall: (i) => (isRichContent(i.answer) ? undefined : 'needs a rich-text "answer"'),
  multiple_choice: (i) => {
    if (!Array.isArray(i.options) || i.options.length === 0) return 'needs a non-empty "options" array'
    const bad = i.options.findIndex(
      (o) => !isObject(o) || !isNonEmptyString(o.id) || !isRichContent(o.content) || typeof o.correct !== 'boolean',
    )
    if (bad >= 0) return `has an option at position ${bad + 1} without a valid "id", "content" and boolean "correct"`
    return undefined
  },
  write_code: (i) => {
    if (typeof i.language !== 'string') return 'needs a string "language"'
    if (typeof i.starterCode !== 'string') return 'needs a string "starterCode"'
    if (!isStringArray(i.acceptedAnswers)) return 'needs an "acceptedAnswers" array of strings'
    return undefined
  },
  ordering: (i) => {
    if (!Array.isArray(i.items) || i.items.length === 0) return 'needs a non-empty "items" array'
    if (i.items.some((it) => !isObject(it) || !isNonEmptyString(it.id) || !isRichContent(it.content)))
      return 'has an item without a valid "id" and rich-text "content"'
    if (!isStringArray(i.correctOrder)) return 'needs a "correctOrder" array of item ids'
    return undefined
  },
  matching: (i) => {
    if (!Array.isArray(i.columns) || i.columns.length < 2) return 'needs at least two "columns"'
    if (i.columns.some((c) => !isObject(c) || !isNonEmptyString(c.id) || !Array.isArray(c.items)))
      return 'has a column without a valid "id" and "items" array'
    if (!Array.isArray(i.relationships)) return 'needs a "relationships" array'
    return undefined
  },
  walkthrough: (i) => {
    if (!isRichContent(i.scenario)) return 'needs a rich-text "scenario"'
    if (!Array.isArray(i.steps) || i.steps.length === 0) return 'needs a non-empty "steps" array'
    if (i.steps.some((s) => !isObject(s) || !isNonEmptyString(s.id) || !isRichContent(s.prompt) || !isObject(s.response)))
      return 'has a step without a valid "id", rich-text "prompt" and "response" object'
    return undefined
  },
}

function assertValidInteraction(index: number, id: unknown, raw: unknown): void {
  if (!isObject(raw)) {
    fail('Card', index, id, 'is missing its "interaction" object.')
  }
  const type = raw.type
  if (!INTERACTION_TYPES.includes(type as InteractionType)) {
    fail(
      'Card',
      index,
      id,
      `has an unsupported interaction type ${JSON.stringify(type)}. ` +
        `Supported types: ${INTERACTION_TYPES.join(', ')}.`,
    )
  }
  const problem = INTERACTION_CHECKS[type as InteractionType](raw)
  if (problem) {
    fail('Card', index, id, `is a "${String(type)}" card but ${problem}.`)
  }
}

// ---- Card ----

export function assertValidCards(cards: unknown[]): asserts cards is Card[] {
  cards.forEach((raw, i) => {
    if (!isObject(raw)) fail('Card', i, undefined, 'is not an object.')
    const id = raw.id
    if (!isNonEmptyString(id)) fail('Card', i, id, 'is missing a valid "id".')
    if (!isNonEmptyString(raw.deckId)) fail('Card', i, id, 'is missing a valid "deckId".')

    // Checked against the app's own version rather than "is a number": a card
    // written for a different card model would otherwise be stored as if it
    // were the current shape, which is exactly the silent corruption the
    // version-1 backup guard exists to prevent.
    if (raw.schemaVersion !== CARD_SCHEMA_VERSION) {
      fail(
        'Card',
        i,
        id,
        `has "schemaVersion" ${JSON.stringify(raw.schemaVersion)}, but this app reads ` +
          `card schema version ${CARD_SCHEMA_VERSION}.`,
      )
    }

    if (!isRichContent(raw.prompt)) {
      fail('Card', i, id, 'needs a "prompt" of the form { "format": "markdown", "value": "…" }.')
    }
    for (const key of ['tip', 'explanation'] as const) {
      if (raw[key] !== undefined && !isRichContent(raw[key])) {
        fail('Card', i, id, `has a "${key}" that is not { "format": "markdown", "value": "…" }.`)
      }
    }
    if (!isStringArray(raw.tags)) fail('Card', i, id, 'needs a "tags" array of strings.')
    if (!isFiniteNumber(raw.createdAt) || !isFiniteNumber(raw.updatedAt)) {
      fail('Card', i, id, 'needs numeric "createdAt" and "updatedAt" timestamps.')
    }
    if (typeof raw.suspended !== 'boolean') fail('Card', i, id, 'needs a boolean "suspended".')
    if (raw.order !== undefined && !isFiniteNumber(raw.order)) {
      fail('Card', i, id, 'has an "order" that is not a number.')
    }

    assertValidInteraction(i, id, raw.interaction)
    assertValidScheduling(i, id, raw.scheduling)
  })
}

// ---- ReviewLog ----

export function assertValidReviewLogs(logs: unknown[]): asserts logs is ReviewLog[] {
  logs.forEach((raw, i) => {
    if (!isObject(raw)) fail('ReviewLog', i, undefined, 'is not an object.')
    const id = raw.id
    if (!isNonEmptyString(id)) fail('ReviewLog', i, id, 'is missing a valid "id".')
    if (!isNonEmptyString(raw.cardId)) {
      fail('ReviewLog', i, id, 'is missing a valid "cardId".')
    }
    for (const field of [
      'reviewedAt',
      'durationMs',
      'stabilityBefore',
      'stabilityAfter',
      'difficultyBefore',
      'difficultyAfter',
    ] as const) {
      if (!isFiniteNumber(raw[field])) {
        fail('ReviewLog', i, id, `is missing a numeric "${field}".`)
      }
    }
    if (![1, 2, 3, 4].includes(raw.rating as number)) {
      fail('ReviewLog', i, id, 'has an invalid "rating". Expected 1, 2, 3, or 4.')
    }
    if (typeof raw.autoGraded !== 'boolean') {
      fail('ReviewLog', i, id, 'needs a boolean "autoGraded".')
    }
    for (const field of ['stateBefore', 'state'] as const) {
      if (!SCHEDULING_STATE_KINDS.includes(raw[field] as SchedulingState['state'])) {
        fail(
          'ReviewLog',
          i,
          id,
          `has an invalid "${field}". Expected one of: ${SCHEDULING_STATE_KINDS.join(', ')}.`,
        )
      }
    }
    if (raw.dueAfter !== undefined && !isFiniteNumber(raw.dueAfter)) {
      fail('ReviewLog', i, id, 'has a "dueAfter" that is not a number.')
    }
  })
}

// ---- Referential integrity ----

// The pure half of the deck-reference rule. Which ids count as "known" depends
// on the import mode and on what the repository already holds, so the caller
// (src/data/backup.ts) assembles the set; this only applies the rule.
export function findUnresolvedDeckReference(
  cards: Card[],
  knownDeckIds: ReadonlySet<ID>,
): Card | undefined {
  return cards.find((c) => !knownDeckIds.has(c.deckId))
}
