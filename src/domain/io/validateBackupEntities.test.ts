import { describe, expect, it } from 'vitest'
import type { Card, Deck, ID } from '@/types'
import { CARD_SCHEMA_VERSION } from '@/types/card'
import { ALL_INTERACTION_TYPES, fixtureCard, fixtureCards, fixtureDeck } from './backupFixtures'
import {
  assertValidCards,
  assertValidDecks,
  assertValidReviewLogs,
  findUnresolvedDeckReference,
} from './validateBackupEntities'

// Every negative case starts from a real, valid fixture and breaks exactly one
// thing, so a passing test cannot be an accident of an already-broken fixture.
function brokenCard(mutate: (c: Record<string, unknown>) => void): unknown[] {
  const card = JSON.parse(JSON.stringify(fixtureCard())) as Record<string, unknown>
  mutate(card)
  return [card]
}

function brokenInteraction(
  type: string,
  mutate: (i: Record<string, unknown>) => void,
): unknown[] {
  const card = JSON.parse(JSON.stringify(fixtureCard(type as never))) as Record<string, unknown>
  mutate(card.interaction as Record<string, unknown>)
  return [card]
}

describe('assertValidDecks', () => {
  it('accepts a real deck, with and without its optional fields', () => {
    expect(() =>
      assertValidDecks([
        fixtureDeck(),
        fixtureDeck({ id: 'd2', parentId: 'deck-1', description: 'Nested', language: 'en' }),
      ]),
    ).not.toThrow()
  })

  it('rejects a deck that is not an object', () => {
    expect(() => assertValidDecks(['deck-1'])).toThrow(/Deck 1 is not an object/)
  })

  it('rejects a missing id', () => {
    expect(() => assertValidDecks([{ ...fixtureDeck(), id: '' }])).toThrow(/valid "id"/)
  })

  it('rejects a missing name', () => {
    const { name: _name, ...rest } = fixtureDeck()
    expect(() => assertValidDecks([rest])).toThrow(/Deck 1 \("deck-1"\).*valid "name"/)
  })

  it('rejects non-numeric timestamps', () => {
    expect(() => assertValidDecks([{ ...fixtureDeck(), updatedAt: '2026-08-18' }])).toThrow(
      /numeric "createdAt" and "updatedAt"/,
    )
  })

  it('rejects a non-string parentId', () => {
    expect(() => assertValidDecks([{ ...fixtureDeck(), parentId: 7 }])).toThrow(/"parentId"/)
  })

  // parentId is deliberately NOT checked referentially: useDeleteDeck does not
  // reparent children, and collectionTree already tolerates a dangling parent,
  // so rejecting one would refuse a legitimate existing backup.
  it('accepts a deck whose parent is absent', () => {
    const decks: Deck[] = [fixtureDeck({ parentId: 'gone' })]
    expect(() => assertValidDecks(decks)).not.toThrow()
  })
})

describe('assertValidReviewLogs', () => {
  const valid = {
    id: 'log-1',
    cardId: 'card-1',
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
  }

  it('accepts the current required contract', () => {
    expect(() => assertValidReviewLogs([valid])).not.toThrow()
  })

  it('rejects a prototype row without stateBefore', () => {
    const { stateBefore: _stateBefore, ...prototype } = valid
    expect(() => assertValidReviewLogs([prototype])).toThrow(/stateBefore/)
  })

  it('rejects an invalid pre-grade state', () => {
    expect(() => assertValidReviewLogs([{ ...valid, stateBefore: 'graduated' }])).toThrow(
      /stateBefore/,
    )
  })
})

describe('assertValidCards', () => {
  it('accepts one card of every interaction type', () => {
    expect(ALL_INTERACTION_TYPES).toHaveLength(6)
    expect(() => assertValidCards(fixtureCards())).not.toThrow()
  })

  it('accepts the optional tip, explanation and order fields', () => {
    expect(() =>
      assertValidCards([
        fixtureCard('recall', {
          tip: { format: 'markdown', value: 'Think about memory.' },
          explanation: { format: 'markdown', value: 'Because...' },
          order: 3,
        }),
      ]),
    ).not.toThrow()
  })

  it('rejects a missing id', () => {
    expect(() => assertValidCards(brokenCard((c) => delete c.id))).toThrow(
      /Card 1 is missing a valid "id"/,
    )
  })

  it('rejects a missing deckId', () => {
    expect(() => assertValidCards(brokenCard((c) => delete c.deckId))).toThrow(/valid "deckId"/)
  })

  it('rejects a card written for another card schema version', () => {
    expect(() => assertValidCards(brokenCard((c) => (c.schemaVersion = 1)))).toThrow(
      new RegExp(`"schemaVersion" 1.*card schema version ${CARD_SCHEMA_VERSION}`),
    )
    expect(() => assertValidCards(brokenCard((c) => delete c.schemaVersion))).toThrow(
      /schemaVersion/,
    )
  })

  it('rejects a prompt that is a bare string rather than rich content', () => {
    expect(() => assertValidCards(brokenCard((c) => (c.prompt = 'What is a thread?')))).toThrow(
      /"format": "markdown"/,
    )
  })

  it('rejects malformed tags, timestamps and suspended flags', () => {
    expect(() => assertValidCards(brokenCard((c) => (c.tags = 'os')))).toThrow(/"tags" array/)
    expect(() => assertValidCards(brokenCard((c) => (c.createdAt = null)))).toThrow(
      /numeric "createdAt"/,
    )
    expect(() => assertValidCards(brokenCard((c) => delete c.suspended))).toThrow(
      /boolean "suspended"/,
    )
  })

  it('rejects an unsupported interaction type by name, listing the supported ones', () => {
    expect(() => assertValidCards(brokenInteraction('recall', (i) => (i.type = 'mcq')))).toThrow(
      /unsupported interaction type "mcq".*recall, multiple_choice, write_code/,
    )
  })

  it('rejects a missing interaction object', () => {
    expect(() => assertValidCards(brokenCard((c) => delete c.interaction))).toThrow(
      /missing its "interaction" object/,
    )
  })

  it('rejects a structurally empty payload for each interaction type', () => {
    const cases: Array<[string, (i: Record<string, unknown>) => void, RegExp]> = [
      ['recall', (i) => delete i.answer, /rich-text "answer"/],
      ['multiple_choice', (i) => (i.options = []), /non-empty "options"/],
      ['write_code', (i) => (i.acceptedAnswers = 'a + b'), /"acceptedAnswers" array/],
      ['ordering', (i) => delete i.correctOrder, /"correctOrder" array/],
      ['matching', (i) => (i.columns = []), /at least two "columns"/],
      ['walkthrough', (i) => (i.steps = []), /non-empty "steps"/],
    ]
    for (const [type, mutate, message] of cases) {
      expect(() => assertValidCards(brokenInteraction(type, mutate)), type).toThrow(message)
    }
  })

  it('rejects a multiple choice option without a boolean "correct"', () => {
    expect(() =>
      assertValidCards(
        brokenInteraction('multiple_choice', (i) => {
          delete (i.options as Record<string, unknown>[])[1].correct
        }),
      ),
    ).toThrow(/option at position 2/)
  })

  // A malformed scheduling block is the dangerous one: it reaches the due index
  // and the FSRS adapter, where it breaks Review rather than the import.
  it('rejects scheduling that would break the due query or the scheduler', () => {
    const breakScheduling = (mutate: (s: Record<string, unknown>) => void) =>
      brokenCard((c) => mutate(c.scheduling as Record<string, unknown>))

    expect(() => assertValidCards(brokenCard((c) => delete c.scheduling))).toThrow(
      /missing its "scheduling" block/,
    )
    expect(() => assertValidCards(breakScheduling((s) => delete s.due))).toThrow(
      /numeric "scheduling.due"/,
    )
    expect(() => assertValidCards(breakScheduling((s) => (s.due = '2026-08-18')))).toThrow(
      /numeric "scheduling.due"/,
    )
    expect(() => assertValidCards(breakScheduling((s) => (s.stability = Number.NaN)))).toThrow(
      /numeric "scheduling.stability"/,
    )
    expect(() => assertValidCards(breakScheduling((s) => delete s.learningSteps))).toThrow(
      /numeric "scheduling.learningSteps"/,
    )
    expect(() => assertValidCards(breakScheduling((s) => (s.state = 'fresh')))).toThrow(
      /invalid "scheduling.state".*new, learning, review, relearning/,
    )
  })

  it('accepts an optional lastReview but rejects a non-numeric one', () => {
    expect(() =>
      assertValidCards(
        brokenCard((c) => ((c.scheduling as Record<string, unknown>).lastReview = 1750000000000)),
      ),
    ).not.toThrow()
    expect(() =>
      assertValidCards(
        brokenCard((c) => ((c.scheduling as Record<string, unknown>).lastReview = 'yesterday')),
      ),
    ).toThrow(/"scheduling.lastReview"/)
  })

  it('names the offending card by position and id', () => {
    const cards: unknown[] = [fixtureCard('recall'), fixtureCard('ordering', { id: 'card-bad' })]
    ;(cards[1] as Card).tags = undefined as never
    expect(() => assertValidCards(cards)).toThrow(/Card 2 \("card-bad"\)/)
  })
})

describe('findUnresolvedDeckReference', () => {
  const known = (ids: ID[]) => new Set(ids)

  it('returns undefined when every card resolves', () => {
    expect(findUnresolvedDeckReference(fixtureCards(), known(['deck-1']))).toBeUndefined()
  })

  it('returns the first card whose deck is unknown', () => {
    const cards: Card[] = [
      fixtureCard('recall'),
      fixtureCard('ordering', { id: 'orphan', deckId: 'deck-missing' }),
    ]
    expect(findUnresolvedDeckReference(cards, known(['deck-1']))?.id).toBe('orphan')
  })

  it('treats a deck the caller already knows about as resolvable', () => {
    const cards: Card[] = [fixtureCard('recall', { deckId: 'deck-existing' })]
    expect(findUnresolvedDeckReference(cards, known(['deck-existing']))).toBeUndefined()
  })
})
