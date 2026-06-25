import { describe, expect, it } from 'vitest'
import type { Deck } from '@/types'
import { buildDeckTree, descendantIds, flattenDeckTree } from './tree'

const deck = (id: string, name: string, parentId?: string): Deck => ({
  id,
  name,
  parentId,
  createdAt: 1,
  updatedAt: 1,
})

describe('buildDeckTree', () => {
  it('nests by parentId and sorts children by name', () => {
    const tree = buildDeckTree([
      deck('os', 'OS'),
      deck('proc', 'Processes', 'os'),
      deck('threads', 'Threads', 'proc'),
      deck('sched', 'Scheduling', 'proc'),
    ])
    expect(tree).toHaveLength(1)
    expect(tree[0].deck.id).toBe('os')
    expect(tree[0].children.map((c) => c.deck.name)).toEqual(['Processes'])
    // children sorted: Scheduling before Threads
    expect(tree[0].children[0].children.map((c) => c.deck.name)).toEqual([
      'Scheduling',
      'Threads',
    ])
    expect(tree[0].children[0].children[0].depth).toBe(2)
  })

  it('treats decks with a missing parent as roots', () => {
    const tree = buildDeckTree([deck('a', 'A', 'ghost')])
    expect(tree).toHaveLength(1)
    expect(tree[0].deck.id).toBe('a')
  })

  it('does not loop on a self-referential parent', () => {
    const tree = buildDeckTree([deck('x', 'X', 'x')])
    // x resolves to root (parent exists = itself); no infinite recursion
    expect(tree.flatMap(descendantIds)).toContain('x')
  })
})

describe('descendantIds', () => {
  it('collects the whole subtree including the node', () => {
    const tree = buildDeckTree([
      deck('os', 'OS'),
      deck('proc', 'Processes', 'os'),
      deck('threads', 'Threads', 'proc'),
    ])
    expect(descendantIds(tree[0]).sort()).toEqual(['os', 'proc', 'threads'])
  })
})

describe('flattenDeckTree', () => {
  it('produces display order with full paths', () => {
    const tree = buildDeckTree([
      deck('os', 'OS'),
      deck('proc', 'Processes', 'os'),
    ])
    const flat = flattenDeckTree(tree)
    expect(flat.map((f) => f.path)).toEqual(['OS', 'OS / Processes'])
  })
})
