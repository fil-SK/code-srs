import type { ID, Millis } from './common'
import type { DeckIconId } from '../design/deckIcons'

export interface Deck {
  id: ID
  name: string
  description?: string
  parentId?: ID // optional nesting
  language?: string // language code of the deck's cards (see domain/decks/languages)
  iconId?: DeckIconId
  createdAt: Millis
  updatedAt: Millis
}
