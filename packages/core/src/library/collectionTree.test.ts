import { describe, expect, it } from 'vitest'
import type { Deck } from '../types'
import {
  buildCollectionTree,
  collectionIdFor,
  collectionPathFor,
  deriveCollections,
  getSubtreeCollectionIds,
  type LibraryCollection,
} from './collectionTree'
// `leafDecks` is the deck-tree function this module used to re-export under
// the same name; the cases below are unchanged and still assert on it.
import { leafDecks } from '../domain/decks/tree'

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

// Both breadcrumbs call this. The cycle cases exist because deck parents are
// deliberately not validated referentially on import, so a hand-edited backup
// can produce a parent ring the UI itself cannot create - which used to hang
// the tab here (audit 2026-08-22). Every case asserts the result has no
// repeated id, so a future "fix" that merely bounds the loop still fails.
describe('collectionPathFor', () => {
  function collection(id: string, name: string, parentId?: string): LibraryCollection {
    return { id, name, parentId }
  }

  it('returns an empty path for no collection', () => {
    expect(collectionPathFor([], undefined)).toEqual([])
  })

  it('returns just the collection itself when it is a root', () => {
    const cs = [collection('cpp', 'C++')]
    expect(collectionPathFor(cs, 'cpp').map((c) => c.id)).toEqual(['cpp'])
  })

  it('returns the full ancestor chain root-first', () => {
    const cs = [
      collection('cpp', 'C++'),
      collection('templates', 'Templates', 'cpp'),
      collection('variadic', 'Variadic', 'templates'),
    ]
    expect(collectionPathFor(cs, 'variadic').map((c) => c.id)).toEqual([
      'cpp',
      'templates',
      'variadic',
    ])
  })

  it('truncates at the highest resolvable ancestor when a parent is missing', () => {
    const cs = [collection('templates', 'Templates', 'ghost'), collection('variadic', 'Variadic', 'templates')]
    expect(collectionPathFor(cs, 'variadic').map((c) => c.id)).toEqual(['templates', 'variadic'])
  })

  it('terminates on a self-cycle', () => {
    const cs = [collection('a', 'A', 'a')]
    const path = collectionPathFor(cs, 'a')
    expect(path.map((c) => c.id)).toEqual(['a'])
  })

  it('terminates on a two-node cycle', () => {
    const cs = [collection('a', 'A', 'b'), collection('b', 'B', 'a')]
    const path = collectionPathFor(cs, 'a')
    const ids = path.map((c) => c.id)
    expect(ids).toEqual(['b', 'a'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('terminates on a longer cycle', () => {
    const cs = [
      collection('a', 'A', 'c'),
      collection('b', 'B', 'a'),
      collection('c', 'C', 'b'),
    ]
    const path = collectionPathFor(cs, 'a')
    const ids = path.map((c) => c.id)
    expect(ids).toEqual(['b', 'c', 'a'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('terminates when the cycle sits above the starting collection', () => {
    const cs = [
      collection('a', 'A', 'b'),
      collection('b', 'B', 'a'),
      collection('leaf', 'Leaf', 'a'),
    ]
    const ids = collectionPathFor(cs, 'leaf').map((c) => c.id)
    expect(ids).toEqual(['b', 'a', 'leaf'])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is cycle-safe against collections derived from a cyclic deck graph', () => {
    // deriveCollections keeps both decks (each is some deck's parent) with
    // their parentIds intact, so the ring survives all the way to here.
    const collections = deriveCollections([deck('a', 'A', 'b'), deck('b', 'B', 'a')])
    const ids = collectionPathFor(collections, 'a').map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('a')
  })
})
