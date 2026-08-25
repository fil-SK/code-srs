import { demoCardStatus, isDemoCardDue, resolveDemoScheduling } from './demoScheduling'
import { createDemoWorkspace } from './demoWorkspace'

const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)
const DAY_MS = 86_400_000

const workspace = createDemoWorkspace(NOW)

describe('resolveDemoScheduling', () => {
  const seed = {
    state: 'review' as const,
    dueOffsetDays: -2,
    reps: 6,
    lapses: 1,
    stability: 12.4,
    difficulty: 5.1,
    lastReviewDaysAgo: 12,
  }

  it('anchors the due date to the instant it is given', () => {
    expect(resolveDemoScheduling(seed, NOW).due).toBe(NOW - 2 * DAY_MS)
  })

  it('carries the authored FSRS fields through unchanged', () => {
    const state = resolveDemoScheduling(seed, NOW)

    expect(state.reps).toBe(6)
    expect(state.lapses).toBe(1)
    expect(state.stability).toBe(12.4)
    expect(state.difficulty).toBe(5.1)
    expect(state.state).toBe('review')
  })

  it('leaves a never-reviewed card without a last review', () => {
    const state = resolveDemoScheduling({ ...seed, state: 'new', lastReviewDaysAgo: null }, NOW)
    expect(state.lastReview).toBeUndefined()
  })
})

describe('demoCardStatus', () => {
  it('derives the label from scheduling rather than an authored flag', () => {
    const card = workspace.cards[0]

    expect(demoCardStatus({ ...card, scheduling: { ...card.scheduling, state: 'new' } })).toBe('New')
    expect(demoCardStatus({ ...card, scheduling: { ...card.scheduling, state: 'review' } })).toBe(
      'Review',
    )
    expect(demoCardStatus({ ...card, scheduling: { ...card.scheduling, state: 'learning' } })).toBe(
      'Learning',
    )
    // Relearning collapses into Learning: MobileCardStatus is deliberately the
    // three-state subset the mobile card list presents.
    expect(
      demoCardStatus({ ...card, scheduling: { ...card.scheduling, state: 'relearning' } }),
    ).toBe('Learning')
  })
})

describe('isDemoCardDue', () => {
  const card = workspace.cards[0]

  it('is due at its due instant and after it', () => {
    expect(isDemoCardDue(card, card.scheduling.due)).toBe(true)
    expect(isDemoCardDue(card, card.scheduling.due + 1)).toBe(true)
  })

  it('is not due before it', () => {
    expect(isDemoCardDue(card, card.scheduling.due - 1)).toBe(false)
  })

  it('is never due while suspended', () => {
    expect(isDemoCardDue({ ...card, suspended: true }, card.scheduling.due + DAY_MS)).toBe(false)
  })
})

describe('the seeded demo workspace', () => {
  it('gives every card a real interaction payload and real scheduling', () => {
    for (const card of workspace.cards) {
      expect(card.interaction.type).toBeTruthy()
      expect(typeof card.scheduling.due).toBe('number')
      expect(card.prompt.format).toBe('markdown')
    }
  })

  it('covers all six interaction types, so a demo session can show each', () => {
    expect(new Set(workspace.cards.map((card) => card.interaction.type))).toEqual(
      new Set(['recall', 'multiple_choice', 'write_code', 'ordering', 'matching', 'walkthrough']),
    )
  })

  it('starts with no review history', () => {
    expect(workspace.reviewLogs).toEqual([])
  })

  it('leaves some cards not due, so the demo is not one undifferentiated pile', () => {
    const due = workspace.cards.filter((card) => isDemoCardDue(card, NOW))
    expect(due.length).toBeGreaterThan(0)
    expect(due.length).toBeLessThan(workspace.cards.length)
  })
})
