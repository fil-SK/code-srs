import { beforeEach, describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { getRepository } from '@/data'
import { cardStateFromCard } from '@/domain/scheduling/cardState'
import { saveRecallCard } from './saveRecallCard'
import { emptyRecallForm } from './recallForm'

const repo = getRepository()

const scheduling = {
  due: 1000,
  stability: 1.5,
  difficulty: 2.5,
  elapsedDays: 3,
  scheduledDays: 4,
  reps: 2,
  lapses: 1,
  learningSteps: 0,
  state: 'review' as const,
}

const legacyCard: Card = {
  id: 'legacy-1',
  deckId: 'deck-1',
  tags: ['x'],
  createdAt: 111,
  updatedAt: 222,
  suspended: false,
  scheduling,
  type: 'basic',
  content: { front: 'Q', back: 'A' },
}

beforeEach(async () => {
  await Promise.all([
    repo.cards.clear(),
    repo.cardStates.clear(),
    repo.cardsV2.clear(),
  ])
})

describe('saveRecallCard', () => {
  it('creates a fresh CardV2Record for a new card', async () => {
    const form = { ...emptyRecallForm('deck-1'), prompt: 'Q', answer: 'A' }
    const record = await saveRecallCard(repo, form, { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(await repo.cardsV2.getById(record.id)).toEqual(record)
  })

  it('updates an existing CardV2Record in place, keeping its id/scheduling', async () => {
    const form = { ...emptyRecallForm('deck-1'), prompt: 'Q1', answer: 'A1' }
    const created = await saveRecallCard(repo, form, { kind: 'new' })

    const edited = await saveRecallCard(
      repo,
      { ...form, prompt: 'Q2' },
      { kind: 'v2', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(await repo.cardsV2.getAll()).toHaveLength(1)
  })

  it('migrates a legacy v1 card: same id/scheduling, old row and its CardState mirror deleted', async () => {
    await repo.cards.put(legacyCard)
    await repo.cardStates.put(cardStateFromCard(legacyCard))

    const form = { ...emptyRecallForm('deck-1'), prompt: 'Edited Q', answer: 'Edited A' }
    const record = await saveRecallCard(repo, form, { kind: 'v1', card: legacyCard }, 999)

    // Same identity, scheduling/suspended carried over so history/FSRS state
    // isn't reset by the migration.
    expect(record.id).toBe(legacyCard.id)
    expect(record.createdAt).toBe(legacyCard.createdAt)
    expect(record.suspended).toBe(legacyCard.suspended)
    expect(record.scheduling).toEqual(legacyCard.scheduling)
    expect(record.prompt.value).toBe('Edited Q')

    // One persisted record, not two.
    expect(await repo.cards.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardStates.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardsV2.getById(legacyCard.id)).toEqual(record)
  })
})
