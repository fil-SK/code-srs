import { describe, it, expect } from 'vitest'
import type { Card } from '@/types'
import type { CardV2Record } from '@/types/cardV2'
import { buildCardDeckMap } from './cardDeckIndex'

function v1(id: string, deckId: string): Card {
  return { id, deckId } as unknown as Card
}

function v2(id: string, deckId: string): CardV2Record {
  return { id, deckId } as unknown as CardV2Record
}

describe('buildCardDeckMap', () => {
  it('resolves cards that live only in the v1 store', () => {
    const map = buildCardDeckMap([v1('a', 'deck-a')], [])
    expect(map.get('a')).toBe('deck-a')
  })

  it('resolves cards that live only in the v2 store', () => {
    const map = buildCardDeckMap([], [v2('b', 'deck-b')])
    expect(map.get('b')).toBe('deck-b')
  })

  // Editing a legacy card in the Recall editor deletes the v1 row and writes a
  // v2 record under the same id, so this is the case a v1-only map lost.
  it('resolves a v2 record that replaced a v1 card of the same id', () => {
    const map = buildCardDeckMap([], [v2('a', 'deck-moved')])
    expect(map.get('a')).toBe('deck-moved')
  })

  it('prefers the v2 record when the same id is present in both stores', () => {
    const map = buildCardDeckMap([v1('a', 'deck-old')], [v2('a', 'deck-new')])
    expect(map.get('a')).toBe('deck-new')
  })

  it('has no entry for an unknown card', () => {
    expect(buildCardDeckMap([], []).get('gone')).toBeUndefined()
  })
})
