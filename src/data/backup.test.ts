import { beforeEach, describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { getRepository } from './index'
import { exportBackup, importBackup } from './backup'

const repo = getRepository()

beforeEach(async () => {
  await Promise.all([
    repo.cards.clear(),
    repo.decks.clear(),
    repo.drafts.clear(),
    repo.reviews.clear(),
  ])
})

const card: Card = {
  id: 'c1',
  deckId: 'd1',
  tags: ['x'],
  createdAt: 1,
  updatedAt: 1,
  suspended: false,
  scheduling: initialSchedulingState(1),
  type: 'basic',
  content: { front: 'q', back: 'a' },
}

describe('export/import round-trip', () => {
  it('restores cards and decks via replace import', async () => {
    await repo.decks.put({ id: 'd1', name: 'C++', createdAt: 1, updatedAt: 1 })
    await repo.cards.put(card)

    const backup = await exportBackup()
    expect(backup.data.cards).toHaveLength(1)
    expect(backup.data.decks).toHaveLength(1)

    await Promise.all([repo.cards.clear(), repo.decks.clear()])
    expect(await repo.cards.getAll()).toHaveLength(0)

    await importBackup(backup, 'replace')
    expect(await repo.cards.getAll()).toHaveLength(1)
    expect((await repo.cards.getById('c1'))?.deckId).toBe('d1')
    expect(await repo.decks.getAll()).toHaveLength(1)
  })

  it('merge import upserts without wiping existing', async () => {
    await repo.cards.put(card)
    const backup = await exportBackup()
    await repo.cards.put({ ...card, id: 'c2' })

    await importBackup(backup, 'merge')
    expect(await repo.cards.getAll()).toHaveLength(2) // c2 kept, c1 upserted
  })
})
