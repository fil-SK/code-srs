import { beforeEach, describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { getRepository } from '@/data'
import { cardStateFromCard } from '@/domain/scheduling/cardState'
import { saveWalkthroughCard } from './saveWalkthroughCard'
import {
  cardV2RecordToWalkthroughForm,
  emptyWalkthroughForm,
  legacyStoryCardToForm,
} from './walkthroughForm'

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
  id: 'legacy-story-1',
  deckId: 'deck-1',
  tags: ['x'],
  createdAt: 111,
  updatedAt: 222,
  suspended: false,
  scheduling,
  type: 'story',
  content: {
    intro: 'Trace it',
    code: { language: 'cpp', code: 'class A {};' },
    steps: [{ id: 's1', prompt: 'What runs first?', answer: 'Base ctor', highlight: '1-2' }],
  },
}

function filledForm() {
  const form = emptyWalkthroughForm('deck-1')
  return {
    ...form,
    prompt: 'Q',
    scenario: 'Scenario',
    steps: [{ ...form.steps[0], prompt: 'Step prompt', recallAnswer: 'Step answer' }],
  }
}

beforeEach(async () => {
  await Promise.all([repo.cards.clear(), repo.cardStates.clear(), repo.cardsV2.clear()])
})

describe('saveWalkthroughCard', () => {
  it('creates a fresh CardV2Record for a new card', async () => {
    const record = await saveWalkthroughCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('walkthrough')
    expect(await repo.cardsV2.getById(record.id)).toEqual(record)
  })

  it('updates an existing CardV2Record in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveWalkthroughCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardV2RecordToWalkthroughForm(created),
      prompt: 'Q2',
    }
    const edited = await saveWalkthroughCard(
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

    const reloaded = cardV2RecordToWalkthroughForm(edited)
    expect(reloaded.steps.map((s) => s.prompt)).toEqual(editedForm.steps.map((s) => s.prompt))
  })

  it('migrates a legacy v1 story card: same id/scheduling, old row and CardState mirror deleted', async () => {
    await repo.cards.put(legacyCard)
    await repo.cardStates.put(cardStateFromCard(legacyCard))

    const form = { ...legacyStoryCardToForm(legacyCard), prompt: 'Edited Q' }

    const record = await saveWalkthroughCard(repo, form, { kind: 'v1', card: legacyCard }, 999)

    expect(record.id).toBe(legacyCard.id)
    expect(record.createdAt).toBe(legacyCard.createdAt)
    expect(record.suspended).toBe(legacyCard.suspended)
    expect(record.scheduling).toEqual(legacyCard.scheduling)
    expect(record.prompt.value).toBe('Edited Q')
    expect(record.interaction.type).toBe('walkthrough')

    expect(await repo.cards.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardStates.getById(legacyCard.id)).toBeUndefined()
    expect(await repo.cardsV2.getById(legacyCard.id)).toEqual(record)
  })
})
