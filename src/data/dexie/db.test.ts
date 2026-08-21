import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDB } from './db'

const names: string[] = []

afterEach(async () => {
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)))
})

describe('AppDB review-log clean break', () => {
  it('upgrades version 1 by clearing incompatible ReviewLogs only', async () => {
    const name = `itera-review-reset-${Date.now()}-${Math.random()}`
    names.push(name)
    const old = new Dexie(name)
    old.version(1).stores({
      cards: 'id, deckId, *tags, scheduling.due',
      decks: 'id, parentId, name',
      drafts: 'id, createdAt',
      reviewLogs: 'id, cardId, reviewedAt',
      roadmaps: 'id, title',
    })
    await old.table('cards').put({ id: 'card-1', deckId: 'deck-1' })
    await old.table('reviewLogs').put({
      id: 'prototype-log',
      cardId: 'card-1',
      reviewedAt: 1,
      state: 'review',
    })
    old.close()

    const upgraded = new AppDB(name)
    await upgraded.open()
    expect(upgraded.verno).toBe(2)
    expect(await upgraded.cards.count()).toBe(1)
    expect(await upgraded.reviewLogs.count()).toBe(0)
    upgraded.close()
  })
})
