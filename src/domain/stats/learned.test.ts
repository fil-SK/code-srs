import { describe, expect, it } from 'vitest'
import type { Card, ReviewLog } from '@/types'
import { richText } from '@/types/card'
import { computeLearned } from './learned'

function card(id: string, deckId = 'deck-1', suspended = false): Card {
  return {
    id,
    schemaVersion: 2,
    deckId,
    prompt: richText(id),
    interaction: { type: 'recall', answer: richText('answer') },
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended,
    scheduling: {
      due: 0,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      learningSteps: 0,
      state: 'new',
    },
  }
}

function log(cardId: string, id = `log-${cardId}`): ReviewLog {
  return {
    id,
    cardId,
    reviewedAt: 1,
    rating: 3,
    autoGraded: false,
    durationMs: 1_000,
    stabilityBefore: 0,
    stabilityAfter: 1,
    difficultyBefore: 0,
    difficultyAfter: 5,
    stateBefore: 'new',
    state: 'learning',
  }
}

describe('computeLearned', () => {
  it('counts unique current active cards with at least one ReviewLog', () => {
    const cards = [card('a'), card('b'), card('c')]
    expect(computeLearned(cards, [])).toEqual({ learned: 0, total: 3 })
    expect(computeLearned(cards, [log('a')])).toEqual({ learned: 1, total: 3 })
    expect(computeLearned(cards, [log('a', 'first'), log('a', 'second'), log('b')])).toEqual({
      learned: 2,
      total: 3,
    })
  })

  it('excludes suspended cards and logs for deleted cards', () => {
    const cards = [card('active'), card('suspended', 'deck-1', true)]
    expect(computeLearned(cards, [log('active'), log('suspended'), log('deleted')])).toEqual({
      learned: 1,
      total: 1,
    })
  })

  it('attributes a moved card to its current deck scope', () => {
    const cards = [card('moved', 'to')]
    const logs = [log('moved')]
    expect(computeLearned(cards, logs, new Set(['from']))).toEqual({ learned: 0, total: 0 })
    expect(computeLearned(cards, logs, new Set(['to']))).toEqual({ learned: 1, total: 1 })
  })
})
