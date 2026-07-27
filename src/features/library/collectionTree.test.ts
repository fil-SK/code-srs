import { describe, expect, it } from 'vitest'
import type { Deck } from '@/types'
import {
  buildCollectionTree,
  collectionIdFor,
  deriveCollections,
  getSubtreeCollectionIds,
  leafDecks,
  selectionFromSearchParams,
  selectionToSearchParams,
} from './collectionTree'

function deck(id: string, name: string, parentId?: string): Deck {
  return { id, name, parentId, createdAt: 0, updatedAt: 0 }
}

describe('deriveCollections / leafDecks', () => {
  it('treats a deck with children as a Collection, and childless decks as leaves', () => {
    const decks = [deck('cpp', 'C++'), deck('td', 'Type Deduction', 'cpp'), deck('misc', 'Odds and Ends')]

    const collections = deriveCollections(decks)
    expect(collections).toEqual([{ id: 'cpp', name: 'C++', parentId: undefined }])

    const leaves = leafDecks(decks).map((d) => d.id)
    expect(leaves.sort()).toEqual(['misc', 'td'])
  })

  it('nests collections to match the deck tree, since every ancestor of a deck-with-children also has children', () => {
    const decks = [
      deck('cpp', 'C++'),
      deck('templates', 'Templates', 'cpp'),
      deck('variadic', 'Variadic Templates', 'templates'),
    ]

    const collections = deriveCollections(decks)
    expect(collections.map((c) => c.id).sort()).toEqual(['cpp', 'templates'])
    expect(collections.find((c) => c.id === 'templates')?.parentId).toBe('cpp')

    expect(leafDecks(decks).map((d) => d.id)).toEqual(['variadic'])
  })

  it('a leaf deck with no parent has no collection (Unfiled)', () => {
    const decks = [deck('misc', 'Odds and Ends')]
    const collections = deriveCollections(decks)
    expect(collectionIdFor(decks[0], collections)).toBeUndefined()
  })

  it('a leaf deck under a collection resolves to its parent as the collectionId', () => {
    const decks = [deck('cpp', 'C++'), deck('td', 'Type Deduction', 'cpp')]
    const collections = deriveCollections(decks)
    expect(collectionIdFor(decks[1], collections)).toBe('cpp')
  })
})

describe('buildCollectionTree / getSubtreeCollectionIds', () => {
  it('includes a collection and all its nested descendant collections', () => {
    const decks = [
      deck('cpp', 'C++'),
      deck('templates', 'Templates', 'cpp'),
      deck('stl', 'STL', 'cpp'),
      deck('variadic', 'Variadic Templates', 'templates'),
      deck('containers', 'Containers', 'stl'), // gives STL a child too, so it's also a collection
    ]
    const collections = deriveCollections(decks)
    const tree = buildCollectionTree(collections)
    expect(tree).toHaveLength(1)
    expect(tree[0].children.map((c) => c.collection.id).sort()).toEqual(['stl', 'templates'])

    expect(getSubtreeCollectionIds(collections, 'cpp').sort()).toEqual(['cpp', 'stl', 'templates'])
    // variadic and containers are leaves (Library decks), not collections.
    expect(leafDecks(decks).map((d) => d.id).sort()).toEqual(['containers', 'variadic'])
  })
})

describe('LibrarySelection <-> URL round-trip', () => {
  it('round-trips all/unfiled/collection selections', () => {
    expect(selectionFromSearchParams(selectionToSearchParams({ kind: 'all' }))).toEqual({ kind: 'all' })
    expect(selectionFromSearchParams(selectionToSearchParams({ kind: 'unfiled' }))).toEqual({ kind: 'unfiled' })
    expect(
      selectionFromSearchParams(selectionToSearchParams({ kind: 'collection', id: 'cpp' })),
    ).toEqual({ kind: 'collection', id: 'cpp' })
  })
})
