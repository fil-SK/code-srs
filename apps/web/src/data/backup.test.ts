import { beforeEach, describe, expect, it } from 'vitest'
import { buildBackup, parseBackup, serializeBackup, type BackupData } from '@/domain/io/backup'
import {
  fixtureCard,
  fixtureDeck,
  fixtureDraft,
  fixtureReviewLog,
  fixtureRoadmap,
} from '@/domain/io/backupFixtures'
import { canReplaceImport, exportBackup, importBackup } from '@itera/core'
import { getRepository } from './index'

// Backup orchestration against the *local* backend. Core's own backup.test.ts
// drives the same primitives against a Supabase double; this one exists for
// what that cannot reach - real Dexie transactions, and therefore Replace.
// It calls the explicit-repository primitives directly rather than the
// configured-repository helpers in hooks/useBackup.ts, because the behaviour
// under test is the orchestration, not the registry.
const repo = getRepository()

beforeEach(async () => {
  await Promise.all([
    repo.cards.clear(),
    repo.decks.clear(),
    repo.drafts.clear(),
    repo.reviews.clear(),
    repo.roadmaps.clear(),
  ])
})

const deck = fixtureDeck()
const card = fixtureCard('recall', { id: 'c1' })

const emptyData: BackupData = { cards: [], decks: [], drafts: [], reviewLogs: [] }

async function storedIds() {
  const sorted = (rows: { id: string }[]) => rows.map((r) => r.id).sort()
  return {
    cards: sorted(await repo.cards.getAll()),
    decks: sorted(await repo.decks.getAll()),
    drafts: sorted(await repo.drafts.getAll()),
    reviewLogs: sorted(await repo.reviews.all()),
    roadmaps: sorted(await repo.roadmaps.getAll()),
  }
}

describe('export/import round-trip', () => {
  it('restores cards and decks via replace import', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)

    const backup = await exportBackup(repo)
    expect(backup.data.cards).toHaveLength(1)
    expect(backup.data.decks).toHaveLength(1)

    await Promise.all([repo.cards.clear(), repo.decks.clear()])
    expect(await repo.cards.getAll()).toHaveLength(0)

    await importBackup(repo, backup, 'replace')
    expect(await repo.cards.getAll()).toHaveLength(1)
    expect((await repo.cards.getById('c1'))?.deckId).toBe('deck-1')
    expect(await repo.decks.getAll()).toHaveLength(1)
  })

  // Every store round-trips, not just the two the original case covered - the
  // replace path now writes all five as one unit.
  it('round-trips a full workspace through export and replace import', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)
    await repo.drafts.put(fixtureDraft({ id: 'd1' }))
    await repo.reviews.append(fixtureReviewLog({ id: 'r1', cardId: 'c1' }))
    await repo.roadmaps.put(fixtureRoadmap({ id: 'm1' }))

    const backup = await exportBackup(repo)
    const before = await storedIds()

    // Through the real file path, so serialization and validation are covered.
    await importBackup(repo, parseBackup(serializeBackup(backup)), 'replace')

    expect(await storedIds()).toEqual(before)
  })

  // Workspace A replaced by workspace B: only B may remain, in every store.
  it('replace leaves only the incoming workspace', async () => {
    await repo.decks.put(fixtureDeck({ id: 'a-deck', name: 'PRIOR USER DECK' }))
    await repo.cards.put(fixtureCard('recall', { id: 'a-card', deckId: 'a-deck' }))
    await repo.drafts.put(fixtureDraft({ id: 'a-draft' }))
    await repo.reviews.append(fixtureReviewLog({ id: 'a-log', cardId: 'a-card' }))
    await repo.roadmaps.put(fixtureRoadmap({ id: 'a-roadmap' }))

    await importBackup(
      repo,
      buildBackup({
        cards: [fixtureCard('ordering', { id: 'b-card', deckId: 'b-deck' })],
        decks: [fixtureDeck({ id: 'b-deck', name: 'INCOMING DECK' })],
        drafts: [fixtureDraft({ id: 'b-draft' })],
        reviewLogs: [fixtureReviewLog({ id: 'b-log', cardId: 'b-card' })],
        roadmaps: [fixtureRoadmap({ id: 'b-roadmap' })],
      }),
      'replace',
    )

    expect(await storedIds()).toEqual({
      cards: ['b-card'],
      decks: ['b-deck'],
      drafts: ['b-draft'],
      reviewLogs: ['b-log'],
      roadmaps: ['b-roadmap'],
    })
  })

  it('merge import upserts without wiping existing', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)
    const backup = await exportBackup(repo)
    await repo.cards.put({ ...card, id: 'c2' })

    await importBackup(repo, backup, 'merge')
    expect(await repo.cards.getAll()).toHaveLength(2) // c2 kept, c1 upserted
  })
})

describe('deck reference validation', () => {
  it('accepts a merge whose cards belong to a deck already in the library', async () => {
    await repo.decks.put(deck)

    // A file holding only cards, the normal shape of an AI-generated top-up.
    const backup = buildBackup({ ...emptyData, cards: [fixtureCard('recall', { id: 'new-1' })] })
    await importBackup(repo, backup, 'merge')

    expect(await repo.cards.getAll()).toHaveLength(1)
  })

  it('rejects a merge whose card names a deck in neither the file nor the library', async () => {
    await repo.decks.put(deck)
    const orphan = fixtureCard('recall', { id: 'orphan', deckId: 'deck-missing' })
    const backup = buildBackup({ ...emptyData, cards: [orphan] })

    await expect(importBackup(repo, backup, 'merge')).rejects.toThrow(
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

    await expect(importBackup(repo, backup, 'replace')).rejects.toThrow(
      /not in this file\. Nothing was imported/,
    )
  })

  it('merge keeps existing entities in every store and upserts the incoming ones', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)
    await repo.drafts.put(fixtureDraft({ id: 'kept-draft' }))
    await repo.reviews.append(fixtureReviewLog({ id: 'kept-log', cardId: 'c1' }))
    await repo.roadmaps.put(fixtureRoadmap({ id: 'kept-roadmap' }))

    await importBackup(
      repo,
      buildBackup({
        // No decks in the file: the existing library must satisfy the card's
        // deckId under Merge.
        cards: [fixtureCard('recall', { id: 'c1', deckId: 'deck-1', suspended: true })],
        decks: [],
        drafts: [fixtureDraft({ id: 'new-draft' })],
        reviewLogs: [fixtureReviewLog({ id: 'new-log', cardId: 'c1' })],
        roadmaps: [fixtureRoadmap({ id: 'new-roadmap' })],
      }),
      'merge',
    )

    expect(await storedIds()).toEqual({
      cards: ['c1'],
      decks: ['deck-1'],
      drafts: ['kept-draft', 'new-draft'],
      reviewLogs: ['kept-log', 'new-log'],
      roadmaps: ['kept-roadmap', 'new-roadmap'],
    })
    // The matching id was upserted, not duplicated or ignored.
    expect((await repo.cards.getById('c1'))?.suspended).toBe(true)
  })

  it('writes nothing and clears nothing when a replace import is rejected', async () => {
    await repo.decks.put(deck)
    await repo.cards.put(card)

    const backup = buildBackup({
      ...emptyData,
      decks: [fixtureDeck({ id: 'deck-2', name: 'Compilers' })],
      cards: [fixtureCard('ordering', { id: 'bad', deckId: 'deck-missing' })],
    })

    await expect(importBackup(repo, backup, 'replace')).rejects.toThrow(/Nothing was imported/)

    // The pre-existing data survived: validation ran before clear().
    expect(await repo.cards.getAll()).toHaveLength(1)
    expect((await repo.cards.getById('c1'))?.id).toBe('c1')
    expect(await repo.decks.getAll()).toHaveLength(1)
    expect(await repo.decks.getById('deck-2')).toBeUndefined()
  })
})

// The whole path the Settings section drives: file text -> parseBackup ->
// importBackup. Audit P1-1's file cleared five stores before failing; nothing
// malformed may now reach the repository at all.
describe('a malformed file never mutates the repository', () => {
  async function seedWorkspace() {
    await repo.decks.put(deck)
    await repo.cards.put(card)
    await repo.drafts.put(fixtureDraft({ id: 'd1' }))
    await repo.reviews.append(fixtureReviewLog({ id: 'r1', cardId: 'c1' }))
    await repo.roadmaps.put(fixtureRoadmap({ id: 'm1' }))
  }

  const INTACT = {
    cards: ['c1'],
    decks: ['deck-1'],
    drafts: ['d1'],
    reviewLogs: ['r1'],
    roadmaps: ['m1'],
  }

  it('rejects the audit reproduction file and leaves every store untouched', async () => {
    await seedWorkspace()

    // Structurally valid except one roadmap without an id, exactly as reproduced.
    const json = serializeBackup(
      buildBackup({
        cards: [fixtureCard('recall', { id: 'incoming', deckId: 'incoming-deck' })],
        decks: [fixtureDeck({ id: 'incoming-deck', name: 'INCOMING DECK' })],
        drafts: [],
        reviewLogs: [],
        roadmaps: [{ title: 'no id here' } as never],
      }),
    )

    expect(() => parseBackup(json)).toThrow(/Roadmap 1 is missing a valid "id"/)
    expect(await storedIds()).toEqual(INTACT)
  })

  it('rejects a malformed draft and leaves every store untouched', async () => {
    await seedWorkspace()
    const { id: _id, ...draft } = fixtureDraft()
    const json = serializeBackup(buildBackup({ ...emptyData, drafts: [draft as never] }))

    expect(() => parseBackup(json)).toThrow(/Draft 1 is missing a valid "id"/)
    expect(await storedIds()).toEqual(INTACT)
  })
})

describe('replace availability', () => {
  it('is offered on the local backend, which can roll a failure back', () => {
    expect(repo.importGuarantee).toBe('transactional')
    expect(canReplaceImport(repo)).toBe(true)
  })
})
