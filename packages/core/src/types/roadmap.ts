import type { ID, Millis } from './common'

// A node on a roadmap. It is not a deck; it is a positioned visual reference to
// one, so decks stay standalone while a roadmap arranges them into an order.
export interface RoadmapNode {
  id: ID
  deckId: ID // the deck this node represents
  x: number // board coordinates, in pixels
  y: number
}

// A directed dependency: study `from` before `to`. Drawn as an arrow.
export interface RoadmapEdge {
  id: ID
  from: ID // source node id
  to: ID // target node id
}

export interface Roadmap {
  id: ID
  title: string
  description?: string
  nodes: RoadmapNode[]
  edges: RoadmapEdge[]
  createdAt: Millis
  updatedAt: Millis
}
