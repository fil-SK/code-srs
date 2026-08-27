import { describe, expect, it } from 'vitest'
import type { Deck } from '../../types'
import { checkDeckDeletion, childDeckCount } from './deletion'

function deck(id: string, parentId?: string): Deck {
  return { id, name: id, createdAt: 0, updatedAt: 0, parentId }
}

describe('checkDeckDeletion', () => {
  it('allows an empty leaf deck', () => {
    expect(checkDeckDeletion({ directCardCount: 0, childDeckCount: 0 })).toEqual({ allowed: true })
  })

  it('refuses a deck that still has cards, and reports the count', () => {
    expect(checkDeckDeletion({ directCardCount: 3, childDeckCount: 0 })).toEqual({
      allowed: false,
      directCardCount: 3,
      childDeckCount: 0,
    })
  })

  it('refuses a collection that still has child decks', () => {
    expect(checkDeckDeletion({ directCardCount: 0, childDeckCount: 2 })).toEqual({
      allowed: false,
      directCardCount: 0,
      childDeckCount: 2,
    })
  })

  it('refuses a collection that has both, and reports both counts', () => {
    expect(checkDeckDeletion({ directCardCount: 1, childDeckCount: 2 })).toEqual({
      allowed: false,
      directCardCount: 1,
      childDeckCount: 2,
    })
  })
})

describe('childDeckCount', () => {
  it('counts only direct children, not descendants', () => {
    const decks = [deck('root'), deck('a', 'root'), deck('b', 'root'), deck('a1', 'a')]
    expect(childDeckCount(decks, 'root')).toBe(2)
    expect(childDeckCount(decks, 'a')).toBe(1)
    expect(childDeckCount(decks, 'b')).toBe(0)
  })

  it('is zero for a deck nothing points at', () => {
    expect(childDeckCount([deck('solo')], 'solo')).toBe(0)
  })
})
