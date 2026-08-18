import { beforeEach, describe, expect, it } from 'vitest'
import { getRepository } from '@/data'
import { saveMatchingCard } from './saveMatchingCard'
import { cardRecordToMatchingForm, emptyMatchingForm} from './matchingForm'

const repo = getRepository()



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
  await Promise.all([repo.cards.clear(), repo.cards.clear(), repo.cards.clear()])
})

describe('saveMatchingCard', () => {
  it('creates a fresh Card for a new card', async () => {
    const record = await saveMatchingCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('matching')
    expect(await repo.cards.getById(record.id)).toEqual(record)
  })

  it('updates an existing Card in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveMatchingCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardRecordToMatchingForm(created),
      prompt: 'Q2',
    }
    const edited = await saveMatchingCard(
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

    // Reload: the persisted record hydrates back into the same row/cell shape.
    const reloaded = cardRecordToMatchingForm(edited)
    expect(reloaded.rows.map((r) => [r.id, r.source])).toEqual(
      editedForm.rows.map((r) => [r.id, r.source]),
    )
  })

})
