import type { Deck, ID } from '@/types'

export interface DeckNode {
  deck: Deck
  depth: number
  children: DeckNode[]
}

// Build a forest from flat decks using parentId. A deck whose parent is missing
// (or absent) becomes a root. Decks caught in a parent cycle are simply dropped
// from the tree (they never resolve to a root) rather than looping forever.
export function buildDeckTree(decks: Deck[]): DeckNode[] {
  const byId = new Map<ID, Deck>()
  for (const d of decks) byId.set(d.id, d)

  const childrenOf = new Map<ID | 'root', Deck[]>()
  for (const d of decks) {
    // Self-parent (only reachable via bad data) is treated as a root so the
    // deck stays visible/manageable rather than vanishing.
    const valid = d.parentId && d.parentId !== d.id && byId.has(d.parentId)
    const key = valid ? d.parentId! : 'root'
    const list = childrenOf.get(key) ?? []
    list.push(d)
    childrenOf.set(key, list)
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }

  function build(parent: ID | 'root', depth: number): DeckNode[] {
    return (childrenOf.get(parent) ?? []).map((deck) => ({
      deck,
      depth,
      children: deck.id === parent ? [] : build(deck.id, depth + 1),
    }))
  }
  return build('root', 0)
}

// All deck ids in a subtree, including the node itself.
export function descendantIds(node: DeckNode): ID[] {
  const ids = [node.deck.id]
  for (const child of node.children) ids.push(...descendantIds(child))
  return ids
}

export interface FlatDeck {
  deck: Deck
  depth: number
  path: string // e.g. "OS / Processes / Threads"
}

// Flatten the tree in display order, carrying each deck's full path.
export function flattenDeckTree(nodes: DeckNode[], parentPath = ''): FlatDeck[] {
  const out: FlatDeck[] = []
  for (const n of nodes) {
    const path = parentPath ? `${parentPath} / ${n.deck.name}` : n.deck.name
    out.push({ deck: n.deck, depth: n.depth, path })
    out.push(...flattenDeckTree(n.children, path))
  }
  return out
}
