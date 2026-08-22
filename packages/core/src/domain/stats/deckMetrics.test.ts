import { describe, expect, it } from 'vitest'
import type { Card } from '../../types'
import { computeDeckMetrics, metricsFor } from './deckMetrics'

function card(overrides: Partial<Card> & { id: string; deckId: string }): Card {
  return {
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended: false,
    scheduling: {
      due: 0,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      state: 'new',
    },
    type: 'basic',
    content: { front: 'Q', back: 'A' },
    ...overrides,
  } as Card
}

describe('computeDeckMetrics', () => {
  it('counts cards and due cards per deck', () => {
    const allCards = [
      card({ id: 'c1', deckId: 'd1' }),
      card({ id: 'c2', deckId: 'd1' }),
      card({ id: 'c3', deckId: 'd2' }),
    ]
    const dueCards = [card({ id: 'c1', deckId: 'd1' })]

    const metrics = computeDeckMetrics(allCards, dueCards)

    expect(metricsFor(metrics, 'd1').cardCount).toBe(2)
    expect(metricsFor(metrics, 'd1').dueCount).toBe(1)
    expect(metricsFor(metrics, 'd2').cardCount).toBe(1)
    expect(metricsFor(metrics, 'd2').dueCount).toBe(0)
    expect(metricsFor(metrics, 'unknown-deck')).toEqual({ cardCount: 0, dueCount: 0, masteryFraction: 0 })
  })

  it('computes masteryFraction as the share of non-suspended cards in the review state', () => {
    const allCards = [
      card({ id: 'c1', deckId: 'd1', scheduling: { ...card({ id: 'x', deckId: 'x' }).scheduling, state: 'review' } }),
      card({ id: 'c2', deckId: 'd1', scheduling: { ...card({ id: 'x', deckId: 'x' }).scheduling, state: 'new' } }),
      card({ id: 'c3', deckId: 'd1', suspended: true, scheduling: { ...card({ id: 'x', deckId: 'x' }).scheduling, state: 'review' } }),
    ]

    const metrics = computeDeckMetrics(allCards, [])
    // Suspended card excluded from the eligible denominator entirely: 1 of 2
    // eligible cards is 'review'.
    expect(metricsFor(metrics, 'd1').masteryFraction).toBeCloseTo(0.5)
  })

  it('tracks the most recent lastReview across a deck\'s cards', () => {
    const withReview = (ms: number | undefined) => ({
      ...card({ id: 'x', deckId: 'x' }).scheduling,
      lastReview: ms,
    })
    const allCards = [
      card({ id: 'c1', deckId: 'd1', scheduling: withReview(500) }),
      card({ id: 'c2', deckId: 'd1', scheduling: withReview(900) }),
      card({ id: 'c3', deckId: 'd1', scheduling: withReview(undefined) }),
    ]

    const metrics = computeDeckMetrics(allCards, [])
    expect(metricsFor(metrics, 'd1').lastStudied).toBe(900)
  })

  it('returns zeroed metrics for a deck with no cards at all', () => {
    const metrics = computeDeckMetrics([], [])
    expect(metricsFor(metrics, 'd1')).toEqual({ cardCount: 0, dueCount: 0, masteryFraction: 0 })
  })
})
