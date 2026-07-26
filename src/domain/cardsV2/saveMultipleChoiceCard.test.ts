import { beforeEach, describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { getRepository } from '@/data'
import { cardStateFromCard } from '@/domain/scheduling/cardState'
import { saveMultipleChoiceCard } from './saveMultipleChoiceCard'
import { cardV2RecordToMultipleChoiceForm, emptyMultipleChoiceForm } from './multipleChoiceForm'

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
  id: 'legacy-mcq-1',
  deckId: 'deck-1',
  tags: ['x'],
  createdAt: 111,
  updatedAt: 222,
  suspended: false,
  scheduling,
  type: 'mcq',
  content: {
    prompt: 'Which are true?',
    options: [
      { id: 'o1', text: 'A' },
      { id: 'o2', text: 'B' },
    ],
    correct: ['o1'],
    multiple: false,
  },
}

function filledForm() {
  const form = emptyMultipleChoiceForm('deck-1')
  return {
    ...form,
    prompt: 'Q',
    options: [
      { ...form.options[0], text: 'A', correct: true },
      { ...form.options[1], text: 'B', correct: false },
    ],
  }
}

beforeEach(async () => {
  await Promise.all([repo.cards.clear(), repo.cardStates.clear(), repo.cardsV2.clear()])
})

describe('saveMultipleChoiceCard', () => {
  it('creates a fresh CardV2Record for a new card', async () => {
    const record = await saveMultipleChoiceCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('multiple_choice')
    expect(await repo.cardsV2.getById(record.id)).toEqual(record)
  })

  it('updates an existing CardV2Record in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveMultipleChoiceCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardV2RecordToMultipleChoiceForm(created),
      prompt: 'Q2',
      randomizeOptions: true,
    }
    const edited = await saveMultipleChoiceCard(
      repo,
      editedForm,
      { kind: 'v2', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(edited.interaction).toMatchObject({ randomizeOptions: true })
    expect(await repo.cardsV2.getAll()).toHaveLength(1)

    // Reload: the persisted record hydrates back into the same option/mode shape.
    const reloaded = cardV2RecordToMultipleChoiceForm(edited)
    expect(reloaded.options.map((o) => [o.id, o.text, o.correct])).toEqual(
      editedForm.options.map((o) => [o.id, o.text, o.correct]),
    )
  })

  it('migrates a legacy v1 mcq card: same id/scheduling, old row and its CardState mirror deleted', async () => {
    await repo.cards.put(legacyCard)
    await repo.cardStates.put(cardStateFromCard(legacyCard))

    const form = { ...filledForm(), prompt: 'Edited Q' }
    const record = await saveMultipleChoiceCard(repo, form, { kind: 'v1', card: legacyCard }, 999)

    expect(record.id).toBe(legacyCard.id)
    expect(record.createdAt).toBe(legacyCard.createdAt)
    expect(record.suspended).toBe(legacyCard.suspended)
    expect(record.scheduling).toEqual(legacyCard.scheduling)
    expect(record.prompt.value).toBe('Edited Q')

    expect(await repo.cards.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardStates.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardsV2.getById(legacyCard.id)).toEqual(record)
  })
})
