import type { ID, Millis } from './common'

export interface Deck {
  id: ID
  name: string
  description?: string
  parentId?: ID // optional nesting
  language?: string // language code of the deck's cards (see domain/decks/languages)
  createdAt: Millis
  updatedAt: Millis
}
