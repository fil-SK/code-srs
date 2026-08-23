// The URL round-trip block of the former collectionTree.test.ts. The rest of
// that file moved to packages/core/src/library/collectionTree.test.ts with the
// derivation it covers; these two functions stayed in the web app because they
// encode a selection into a browser query string (see collectionTree.ts).
import { describe, expect, it } from 'vitest'
import { selectionFromSearchParams, selectionToSearchParams } from './collectionTree'

describe('LibrarySelection <-> URL round-trip', () => {
  it('round-trips all/unfiled/collection selections', () => {
    expect(selectionFromSearchParams(selectionToSearchParams({ kind: 'all' }))).toEqual({ kind: 'all' })
    expect(selectionFromSearchParams(selectionToSearchParams({ kind: 'unfiled' }))).toEqual({ kind: 'unfiled' })
    expect(
      selectionFromSearchParams(selectionToSearchParams({ kind: 'collection', id: 'cpp' })),
    ).toEqual({ kind: 'collection', id: 'cpp' })
  })
})
