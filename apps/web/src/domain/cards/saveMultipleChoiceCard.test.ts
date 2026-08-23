import { beforeEach, describe, expect, it } from 'vitest'
import { getRepository } from '@/data'
import { saveMultipleChoiceCard } from './saveMultipleChoiceCard'
import { cardRecordToMultipleChoiceForm, emptyMultipleChoiceForm } from './multipleChoiceForm'

const repo = getRepository()



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
  await Promise.all([repo.cards.clear(), repo.cards.clear(), repo.cards.clear()])
})

describe('saveMultipleChoiceCard', () => {
  it('creates a fresh Card for a new card', async () => {
    const record = await saveMultipleChoiceCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('multiple_choice')
    expect(await repo.cards.getById(record.id)).toEqual(record)
  })

  it('updates an existing Card in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveMultipleChoiceCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardRecordToMultipleChoiceForm(created),
      prompt: 'Q2',
      randomizeOptions: true,
    }
    const edited = await saveMultipleChoiceCard(
      repo,
      editedForm,
      { kind: 'existing', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(edited.interaction).toMatchObject({ randomizeOptions: true })
    expect(await repo.cards.getAll()).toHaveLength(1)

    // Reload: the persisted record hydrates back into the same option/mode shape.
    const reloaded = cardRecordToMultipleChoiceForm(edited)
    expect(reloaded.options.map((o) => [o.id, o.text, o.correct])).toEqual(
      editedForm.options.map((o) => [o.id, o.text, o.correct]),
    )
  })

})
