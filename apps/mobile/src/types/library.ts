import type { Card, Deck, LibraryCollection } from '@itera/core'

/**
 * The card lifecycle states the mobile deck list presents. A subset of web's
 * status filter (which also has Relearning and Suspended) because the mobile
 * card list is a deliberately simplified surface.
 */
export type MobileCardStatus = 'New' | 'Learning' | 'Review'

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
  /**
   * When the deck was last studied. `undefined` means never. Carried alongside
   * the label because the label is prose and the sort needs an ordering.
   */
  lastStudiedAt?: number
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
  /**
   * Cards filed on the collection itself rather than on one of its decks. A
   * collection IS a deck, so it can hold them - and it does as soon as a deck
   * with cards is given a child. Empty for the 'all' and 'unfiled' scopes,
   * which are not decks.
   */
  ownCards: MobileDeckCardViewModel[]
}

export interface MobileDeckCardViewModel {
  id: Card['id']
  prompt: string
  interactionType: Card['interaction']['type']
  interactionLabel: string
  tag: string
  status: MobileCardStatus
}

export interface MobileDeckViewModel {
  id: Deck['id']
  collectionName: string
  name: Deck['name']
  description: NonNullable<Deck['description']>
  cardCount: number
  /**
   * Decks whose parentId is this deck. Non-zero means this deck is a
   * Collection, and it is one of the two facts core's `checkDeckDeletion`
   * needs - the deck screen must not decide the rule itself.
   */
  childDeckCount: number
  dueCount: number
  masteryPercent: number
  lastStudiedLabel: string
  cards: MobileDeckCardViewModel[]
}
