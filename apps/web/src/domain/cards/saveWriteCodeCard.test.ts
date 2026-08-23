import { beforeEach, describe, expect, it } from 'vitest'
import { getRepository } from '@/data'
import { saveWriteCodeCard } from './saveWriteCodeCard'
import { cardRecordToWriteCodeForm, emptyWriteCodeForm } from './writeCodeForm'

const repo = getRepository()



function filledForm() {
  const form = emptyWriteCodeForm('deck-1')
  return {
    ...form,
    prompt: 'Q',
    acceptedAnswers: [{ ...form.acceptedAnswers[0], code: 'return 0;' }],
  }
}

beforeEach(async () => {
  await Promise.all([repo.cards.clear(), repo.cards.clear(), repo.cards.clear()])
})

describe('saveWriteCodeCard', () => {
  it('creates a fresh Card for a new card', async () => {
    const record = await saveWriteCodeCard(repo, filledForm(), { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(record.interaction.type).toBe('write_code')
    expect(await repo.cards.getById(record.id)).toEqual(record)
  })

  it('updates an existing Card in place, keeping its id/scheduling, and reloads faithfully', async () => {
    const created = await saveWriteCodeCard(repo, filledForm(), { kind: 'new' })

    const editedForm = {
      ...cardRecordToWriteCodeForm(created),
      prompt: 'Q2',
      language: 'python',
    }
    const edited = await saveWriteCodeCard(
      repo,
      editedForm,
      { kind: 'existing', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(edited.interaction).toMatchObject({ language: 'python' })
    expect(await repo.cards.getAll()).toHaveLength(1)

    // Reload: the persisted record hydrates back into the same answer shape.
    const reloaded = cardRecordToWriteCodeForm(edited)
    expect(reloaded.acceptedAnswers.map((a) => a.code)).toEqual(
      editedForm.acceptedAnswers.map((a) => a.code),
    )
  })

})
