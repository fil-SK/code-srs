import type { ID, Millis } from './common'

export interface Deck {
  id: ID
  name: string
  description?: string
  parentId?: ID // optional nesting
  createdAt: Millis
  updatedAt: Millis
}
