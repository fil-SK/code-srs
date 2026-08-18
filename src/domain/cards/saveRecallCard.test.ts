import { beforeEach, describe, expect, it } from 'vitest'
import { getRepository } from '@/data'
import { saveRecallCard } from './saveRecallCard'
import { emptyRecallForm } from './recallForm'

const repo = getRepository()



beforeEach(async () => {
  await Promise.all([
    repo.cards.clear(),
  ])
})

describe('saveRecallCard', () => {
  it('creates a fresh Card for a new card', async () => {
    const form = { ...emptyRecallForm('deck-1'), prompt: 'Q', answer: 'A' }
    const record = await saveRecallCard(repo, form, { kind: 'new' })

    expect(record.deckId).toBe('deck-1')
    expect(record.suspended).toBe(false)
    expect(record.scheduling.state).toBe('new')
    expect(await repo.cards.getById(record.id)).toEqual(record)
  })

  it('updates an existing Card in place, keeping its id/scheduling', async () => {
    const form = { ...emptyRecallForm('deck-1'), prompt: 'Q1', answer: 'A1' }
    const created = await saveRecallCard(repo, form, { kind: 'new' })

    const edited = await saveRecallCard(
      repo,
      { ...form, prompt: 'Q2' },
      { kind: 'existing', record: created },
      created.updatedAt + 1000,
    )

    expect(edited.id).toBe(created.id)
    expect(edited.createdAt).toBe(created.createdAt)
    expect(edited.scheduling).toEqual(created.scheduling)
    expect(edited.prompt.value).toBe('Q2')
    expect(await repo.cards.getAll()).toHaveLength(1)
  })

})
