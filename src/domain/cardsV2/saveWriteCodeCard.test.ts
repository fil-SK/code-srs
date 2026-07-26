import { beforeEach, describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { getRepository } from '@/data'
import { cardStateFromCard } from '@/domain/scheduling/cardState'
import { saveWriteCodeCard } from './saveWriteCodeCard'
import { cardV2RecordToWriteCodeForm, emptyWriteCodeForm } from './writeCodeForm'

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
  id: 'legacy-codeCompletion-1',
  deckId: 'deck-1',
  tags: ['x'],
  createdAt: 111,
  updatedAt: 222,
  suspended: false,
  scheduling,
  type: 'codeCompletion',
  content: {
    prompt: 'Sum it.',
    scaffold: { language: 'cpp', code: 'int sum() {}' },
    solutions: ['int sum() { return 0; }'],
    validation: { mode: 'normalizedMatch', ignoreWhitespace: false, caseSensitive: true },
  },
}

function filledForm() {
  const form = emptyWriteCodeForm('deck-1')
  return {
    ...form,
    prompt: 'Q',
    acceptedAnswers: [{ ...form.acceptedAnswers[0], code: 'return 0;' }],
  }
}

beforeEach(async () => {
  await Promise.all([repo.cards.clear(), repo.cardStates.clear(), repo.cardsV2.clear()])
})

describe('saveWriteCodeCard', () => {
  it('creates a fresh CardV2Record for a new card', async () => {
    const record = await saveWriteCodeCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('write_code')
    expect(await repo.cardsV2.getById(record.id)).toEqual(record)
  })

  it('updates an existing CardV2Record in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveWriteCodeCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardV2RecordToWriteCodeForm(created),
      prompt: 'Q2',
      language: 'python',
    }
    const edited = await saveWriteCodeCard(
      repo,
      editedForm,
      { kind: 'v2', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(edited.interaction).toMatchObject({ language: 'python' })
    expect(await repo.cardsV2.getAll()).toHaveLength(1)

    // Reload: the persisted record hydrates back into the same answer shape.
    const reloaded = cardV2RecordToWriteCodeForm(edited)
    expect(reloaded.acceptedAnswers.map((a) => a.code)).toEqual(
      editedForm.acceptedAnswers.map((a) => a.code),
    )
  })

  it('migrates a legacy v1 codeCompletion card: same id/scheduling, old row and its CardState mirror deleted', async () => {
    await repo.cards.put(legacyCard)
    await repo.cardStates.put(cardStateFromCard(legacyCard))

    const form = { ...filledForm(), prompt: 'Edited Q' }
    const record = await saveWriteCodeCard(repo, form, { kind: 'v1', card: legacyCard }, 999)

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
