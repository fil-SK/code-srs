import { describe, it, expect } from 'vitest'
import type { Card } from '@/types'
import { buildCardDeckMap } from './cardDeckIndex'

function card(id: string, deckId: string): Card {
  return { id, deckId } as unknown as Card
}

describe('buildCardDeckMap', () => {
  it('maps each card id to its deck', () => {
    const map = buildCardDeckMap([card('a', 'deck-a'), card('b', 'deck-b')])
    expect(map.get('a')).toBe('deck-a')
    expect(map.get('b')).toBe('deck-b')
  })

  it('has no entry for an unknown card', () => {
    expect(buildCardDeckMap([]).get('gone')).toBeUndefined()
  })
})
