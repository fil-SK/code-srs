import { beforeEach, describe, expect, it } from 'vitest'
import { getRepository } from '@/data'
import { saveWalkthroughCard } from './saveWalkthroughCard'
import {
  cardRecordToWalkthroughForm,
  emptyWalkthroughForm,
} from './walkthroughForm'

const repo = getRepository()



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
  await Promise.all([repo.cards.clear(), repo.cards.clear(), repo.cards.clear()])
})

describe('saveWalkthroughCard', () => {
  it('creates a fresh Card for a new card', async () => {
    const record = await saveWalkthroughCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('walkthrough')
    expect(await repo.cards.getById(record.id)).toEqual(record)
  })

  it('updates an existing Card in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveWalkthroughCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardRecordToWalkthroughForm(created),
      prompt: 'Q2',
    }
    const edited = await saveWalkthroughCard(
      repo,
      editedForm,
      { kind: 'existing', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(await repo.cards.getAll()).toHaveLength(1)

    const reloaded = cardRecordToWalkthroughForm(edited)
    expect(reloaded.steps.map((s) => s.prompt)).toEqual(editedForm.steps.map((s) => s.prompt))
  })

})
