import { beforeEach, describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { getRepository } from '@/data'
import { cardStateFromCard } from '@/domain/scheduling/cardState'
import { saveMatchingCard } from './saveMatchingCard'
import { cardV2RecordToMatchingForm, emptyMatchingForm, legacyMatchingCardToForm } from './matchingForm'

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
  id: 'legacy-matching-1',
  deckId: 'deck-1',
  tags: ['x'],
  createdAt: 111,
  updatedAt: 222,
  suspended: false,
  scheduling,
  type: 'matching',
  content: {
    prompt: 'Match each term',
    triple: true,
    pairs: [
      { id: 'p1', left: 'Stack', right: 'yes', third: 'A' },
      { id: 'p2', left: 'Heap', right: 'no', third: 'B' },
    ],
    options: { right: ['yes', 'no'] },
  },
}

function filledForm() {
  const form = emptyMatchingForm('deck-1')
  return {
    ...form,
    prompt: 'Q',
    sourceLabel: 'Term',
    columns: [{ ...form.columns[0], label: 'Definition' }],
    rows: [
      { ...form.rows[0], source: 'Stack', cells: { [form.columns[0].id]: 'LIFO' } },
      { ...form.rows[1], source: 'Heap', cells: { [form.columns[0].id]: 'Manual' } },
      { ...form.rows[2], source: 'Register', cells: { [form.columns[0].id]: 'Fastest' } },
    ],
  }
}

beforeEach(async () => {
  await Promise.all([repo.cards.clear(), repo.cardStates.clear(), repo.cardsV2.clear()])
})

describe('saveMatchingCard', () => {
  it('creates a fresh CardV2Record for a new card', async () => {
    const record = await saveMatchingCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('matching')
    expect(await repo.cardsV2.getById(record.id)).toEqual(record)
  })

  it('updates an existing CardV2Record in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveMatchingCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardV2RecordToMatchingForm(created),
      prompt: 'Q2',
    }
    const edited = await saveMatchingCard(
      repo,
      editedForm,
      { kind: 'v2', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(await repo.cardsV2.getAll()).toHaveLength(1)

    // Reload: the persisted record hydrates back into the same row/cell shape.
    const reloaded = cardV2RecordToMatchingForm(edited)
    expect(reloaded.rows.map((r) => [r.id, r.source])).toEqual(
      editedForm.rows.map((r) => [r.id, r.source]),
    )
  })

  it('migrates a legacy v1 matching card (triple + fixed-option): same id/scheduling, old row and CardState mirror deleted', async () => {
    await repo.cards.put(legacyCard)
    await repo.cardStates.put(cardStateFromCard(legacyCard))

    const form = { ...legacyMatchingCardToForm(legacyCard), prompt: 'Edited Q' }

    const record = await saveMatchingCard(repo, form, { kind: 'v1', card: legacyCard }, 999)

    expect(record.id).toBe(legacyCard.id)
    expect(record.createdAt).toBe(legacyCard.createdAt)
    expect(record.suspended).toBe(legacyCard.suspended)
    expect(record.scheduling).toEqual(legacyCard.scheduling)
    expect(record.prompt.value).toBe('Edited Q')
    expect(record.interaction.type).toBe('matching')
    if (record.interaction.type === 'matching') {
      expect(record.interaction.columns).toHaveLength(3) // source + fixed 'right' + unique 'third'
    }

    expect(await repo.cards.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardStates.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardsV2.getById(legacyCard.id)).toEqual(record)
  })
})
