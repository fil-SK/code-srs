import { beforeEach, describe, expect, it } from 'vitest'
import { getRepository } from '@/data'
import { saveOrderingCard } from './saveOrderingCard'
import { cardRecordToOrderingForm, emptyOrderingForm } from './orderingForm'

const repo = getRepository()



function filledForm() {
  const form = emptyOrderingForm('deck-1')
  return {
    ...form,
    prompt: 'Q',
    items: [
      { ...form.items[0], text: 'A' },
      { ...form.items[1], text: 'B' },
      { ...form.items[2], text: 'C' },
    ],
  }
}

beforeEach(async () => {
  await Promise.all([repo.cards.clear(), repo.cards.clear(), repo.cards.clear()])
})

describe('saveOrderingCard', () => {
  it('creates a fresh Card for a new card', async () => {
    const record = await saveOrderingCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('ordering')
    expect(await repo.cards.getById(record.id)).toEqual(record)
  })

  it('updates an existing Card in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveOrderingCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardRecordToOrderingForm(created),
      prompt: 'Q2',
      randomize: true,
    }
    const edited = await saveOrderingCard(
      repo,
      editedForm,
      { kind: 'existing', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(edited.interaction).toMatchObject({ randomize: true })
    expect(await repo.cards.getAll()).toHaveLength(1)

    // Reload: the persisted record hydrates back into the same item/order shape.
    const reloaded = cardRecordToOrderingForm(edited)
    expect(reloaded.items.map((i) => [i.id, i.text])).toEqual(
      editedForm.items.map((i) => [i.id, i.text]),
    )
  })

})
