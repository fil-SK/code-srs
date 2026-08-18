import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, type BackupData } from '@/domain/io/backup'
import { fixtureCard, fixtureDeck } from '@/domain/io/backupFixtures'
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

const deck = fixtureDeck()
const card = fixtureCard('recall', { id: 'c1' })

const emptyData: BackupData = { cards: [], decks: [], drafts: [], reviewLogs: [] }

describe('export/import round-trip', () => {
  it('restores cards and decks via replace import', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)

    const backup = await exportBackup()
    expect(backup.data.cards).toHaveLength(1)
    expect(backup.data.decks).toHaveLength(1)

    await Promise.all([repo.cards.clear(), repo.decks.clear()])
    expect(await repo.cards.getAll()).toHaveLength(0)

    await importBackup(backup, 'replace')
    expect(await repo.cards.getAll()).toHaveLength(1)
    expect((await repo.cards.getById('c1'))?.deckId).toBe('deck-1')
    expect(await repo.decks.getAll()).toHaveLength(1)
  })

  it('merge import upserts without wiping existing', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)
    const backup = await exportBackup()
    await repo.cards.put({ ...card, id: 'c2' })

    await importBackup(backup, 'merge')
    expect(await repo.cards.getAll()).toHaveLength(2) // c2 kept, c1 upserted
  })
})

describe('deck reference validation', () => {
  it('accepts a merge whose cards belong to a deck already in the library', async () => {
    await repo.decks.put(deck)

    // A file holding only cards, the normal shape of an AI-generated top-up.
    const backup = buildBackup({ ...emptyData, cards: [fixtureCard('recall', { id: 'new-1' })] })
    await importBackup(backup, 'merge')

    expect(await repo.cards.getAll()).toHaveLength(1)
  })

  it('rejects a merge whose card names a deck in neither the file nor the library', async () => {
    await repo.decks.put(deck)
    const orphan = fixtureCard('recall', { id: 'orphan', deckId: 'deck-missing' })
    const backup = buildBackup({ ...emptyData, cards: [orphan] })

    await expect(importBackup(backup, 'merge')).rejects.toThrow(
      /Card "orphan" belongs to deck "deck-missing", which is not in this file or in your library/,
    )
    expect(await repo.cards.getAll()).toHaveLength(0)
  })

  it('rejects a replace whose card names a deck absent from the file, even if the library has it', async () => {
    // Replace discards the library first, so an existing deck cannot rescue the
    // reference — the message must not claim otherwise.
    await repo.decks.put(deck)
    const orphan = fixtureCard('recall', { id: 'orphan', deckId: 'deck-1' })
    const backup = buildBackup({ ...emptyData, cards: [orphan] })

    await expect(importBackup(backup, 'replace')).rejects.toThrow(
      /not in this file\. Nothing was imported/,
    )
  })

  it('writes nothing and clears nothing when a replace import is rejected', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)

    const backup = buildBackup({
      ...emptyData,
      decks: [fixtureDeck({ id: 'deck-2', name: 'Compilers' })],
      cards: [fixtureCard('ordering', { id: 'bad', deckId: 'deck-missing' })],
    })

    await expect(importBackup(backup, 'replace')).rejects.toThrow(/Nothing was imported/)

    // The pre-existing data survived: validation ran before clear().
    expect(await repo.cards.getAll()).toHaveLength(1)
    expect((await repo.cards.getById('c1'))?.id).toBe('c1')
    expect(await repo.decks.getAll()).toHaveLength(1)
    expect(await repo.decks.getById('deck-2')).toBeUndefined()
  })
})
