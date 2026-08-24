import type { Card, Deck, LibraryCollection } from '@itera/core'

export interface MobileLibraryCollectionViewModel {
  id: 'all' | 'unfiled' | LibraryCollection['id']
  name: string
  kind: 'all' | 'collection' | 'unfiled'
}

export interface MobileLibraryDeckViewModel {
  id: Deck['id']
  name: Deck['name']
  description: NonNullable<Deck['description']>
  cardCount: number
  dueCount: number
  progressPercent: number
  lastStudiedLabel: string
}

export interface MobileLibraryViewModel {
  collections: MobileLibraryCollectionViewModel[]
  decks: MobileLibraryDeckViewModel[]
}

export interface MobileCollectionViewModel {
  id: LibraryCollection['id']
  name: LibraryCollection['name']
  description: string
  deckCount: number
  cardCount: number
  dueToday: number
  decks: MobileLibraryDeckViewModel[]
}

export interface MobileDeckCardViewModel {
  id: Card['id']
  prompt: string
  interactionType: Card['interaction']['type']
  interactionLabel: string
  tag: string
  status: 'New'
}

export interface MobileDeckViewModel {
  id: Deck['id']
  collectionName: string
  name: Deck['name']
  description: NonNullable<Deck['description']>
  cardCount: number
  dueCount: number
  masteryPercent: number
  lastStudiedLabel: string
  cards: MobileDeckCardViewModel[]
}
