import { collectionIdFor, deriveCollections, leafDecks, subtreeIds, type Deck } from '@itera/core'

import { createDemoQueue } from './demoQueue'
import type { DemoEntities } from './demoEntities'
import {
  demoCollectionNameFor,
  demoCollectionViewModel,
  demoCollections,
  demoLeafDecks,
  demoLibraryViewModel,
  demoScopeRail,
  resolveDemoScope,
} from './demoSelectors'
import { createDemoSeed, DEMO_COLLECTION_RAIL } from './demoWorkspace'

// The canonical hierarchy, and the property the conversion existed to get.
//
// The demo used to carry a parallel `DemoCollection[]` plus a `collectionId` on
// each deck. That was a second source of hierarchy truth, and its fatal property
// was that no shared hook could write it: a deck created through
// `useCreateDeck({ parentId })` would have been invisible to every collection
// surface. These cases prove that is no longer possible, including for a deck
// authored after the fixture was written - which is the case M-PARITY-1B needs
// and no UI can exercise yet.

const NOW = Date.UTC(2026, 7, 24, 9, 0, 0)
const seed = createDemoSeed(NOW)
const entities: DemoEntities = seed

const COLLECTION_IDS = [
  'fixture-interview-core',
  'fixture-languages-cpp',
  'fixture-systems',
  'fixture-research',
]

function withDeck(deck: Deck): DemoEntities {
  return { ...entities, decks: [...entities.decks, deck] }
}

describe('the demo dataset uses canonical Deck hierarchy', () => {
  it('carries no collection field on any deck', () => {
    for (const deck of entities.decks) {
      expect(deck).not.toHaveProperty('collectionId')
    }
  })

  it('exposes no collection entity on the seed', () => {
    expect(seed).not.toHaveProperty('collections')
  })

  it('derives exactly the four designed collections from parentId alone', () => {
    expect(demoCollections(entities).map((collection) => collection.id).sort()).toEqual(
      [...COLLECTION_IDS].sort(),
    )
  })

  it('agrees with core, because it calls core rather than copying it', () => {
    expect(demoCollections(entities)).toEqual(deriveCollections(entities.decks))
    expect(demoLeafDecks(entities)).toEqual(leafDecks(entities.decks))
  })

  it('gives a collection the same id as the deck it is', () => {
    for (const collection of demoCollections(entities)) {
      expect(entities.decks.some((deck) => deck.id === collection.id)).toBe(true)
    }
  })

  it('lists only browsable leaves in All Decks, never the collections', () => {
    const all = resolveDemoScope(entities, 'all')!
    expect(all.decks).toEqual(leafDecks(entities.decks))
    for (const id of COLLECTION_IDS) {
      expect(all.decks.some((deck) => deck.id === id)).toBe(false)
    }
  })

  it('treats Unfiled as the absence of a parent', () => {
    const unfiled = resolveDemoScope(entities, 'unfiled')!
    expect(unfiled.decks.length).toBeGreaterThan(0)
    for (const deck of unfiled.decks) expect(deck.parentId).toBeUndefined()
  })

  it('reproduces the designed rail, with the two synthetic scopes in place', () => {
    expect(demoScopeRail(entities).map((entry) => entry.id)).toEqual(DEMO_COLLECTION_RAIL)
  })

  it('takes a collection s name and description from its own deck record', () => {
    const deck = entities.decks.find((entry) => entry.id === 'fixture-systems')!
    const scope = resolveDemoScope(entities, 'fixture-systems')!
    expect(scope.name).toBe(deck.name)
    expect(scope.description).toBe(deck.description)
  })

  it('names a deck s collection from its parent, and Unfiled when it has none', () => {
    const child = entities.decks.find((deck) => deck.id === 'fixture-modern-cpp')!
    const orphan = entities.decks.find((deck) => deck.id === 'fixture-security-engineering')!

    expect(demoCollectionNameFor(entities, child)).toBe('Languages & C++')
    expect(demoCollectionNameFor(entities, orphan)).toBe('Unfiled')
  })

  it('files every leaf under a parent that is itself a derived collection', () => {
    const collections = demoCollections(entities)
    for (const deck of leafDecks(entities.decks)) {
      if (deck.parentId === undefined) continue
      expect(collectionIdFor(deck, collections)).toBe(deck.parentId)
    }
  })
})

// The invariant M-PARITY-1A exists to establish. No authoring UI can produce
// these decks yet, so the test produces them directly - the point is that the
// derivation, not a fixture, is what places them.
describe('a deck authored later', () => {
  const authored: Deck = {
    id: 'authored-deck',
    name: 'Authored Deck',
    description: 'Created after the fixture was written.',
    parentId: 'fixture-systems',
    createdAt: NOW,
    updatedAt: NOW,
  }

  it('appears in its collection with no second field to set', () => {
    const next = withDeck(authored)

    const scope = resolveDemoScope(next, 'fixture-systems')!
    expect(scope.decks.map((deck) => deck.id)).toContain('authored-deck')
    expect(demoCollectionNameFor(next, authored)).toBe('Systems')
  })

  it('appears in All Decks and in the Library view model', () => {
    const next = withDeck(authored)
    expect(resolveDemoScope(next, 'all')!.decks.map((deck) => deck.id)).toContain('authored-deck')
    expect(demoLibraryViewModel(next, NOW).decks.map((deck) => deck.id)).toContain('authored-deck')
  })

  it('counts toward its collection s deck count', () => {
    const before = demoCollectionViewModel(entities, 'fixture-systems', NOW)!
    const after = demoCollectionViewModel(withDeck(authored), 'fixture-systems', NOW)!
    expect(after.deckCount).toBe(before.deckCount + 1)
  })

  it('lands in Unfiled when it is authored with no parent', () => {
    const next = withDeck({ ...authored, parentId: undefined })
    expect(resolveDemoScope(next, 'unfiled')!.decks.map((deck) => deck.id)).toContain(
      'authored-deck',
    )
  })

  it('creates a new collection when a leaf deck becomes its parent', () => {
    // fixture-security-engineering is Unfiled and childless, so it is a leaf and
    // not a collection. Giving it a child must promote it, with no edit to the
    // rail or to any fixture.
    const promoted = withDeck({ ...authored, parentId: 'fixture-security-engineering' })

    expect(demoCollections(entities).map((c) => c.id)).not.toContain(
      'fixture-security-engineering',
    )
    expect(demoCollections(promoted).map((c) => c.id)).toContain('fixture-security-engineering')

    const rail = demoScopeRail(promoted).map((entry) => entry.id)
    expect(rail).toContain('fixture-security-engineering')
    // The designed order is preserved and the newcomer is appended, rather than
    // the rail refusing to show a collection it was not authored with.
    expect(rail.slice(0, DEMO_COLLECTION_RAIL.length)).toEqual(DEMO_COLLECTION_RAIL)

    // It stops being an All Decks row for the same reason: it is now a scope.
    expect(resolveDemoScope(promoted, 'all')!.decks.map((d) => d.id)).not.toContain(
      'fixture-security-engineering',
    )
  })

  it('is covered by a deck-scoped session on its collection, through core s subtreeIds', () => {
    const next = withDeck(authored)
    const scope = subtreeIds(next.decks, 'fixture-systems')

    expect(scope).toContain('fixture-systems')
    expect(scope).toContain('authored-deck')
    expect(scope).toContain('fixture-computer-networks')

    // A session scoped to the collection therefore reaches its children's cards,
    // which is exactly what web's `?deck=` has always meant.
    const queue = createDemoQueue(next, { now: NOW, deckId: 'fixture-systems' })
    for (const card of queue) expect(scope).toContain(card.deckId)
  })
})
