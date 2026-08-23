// Guards the workspace boundary: the web app must reach the canonical contracts
// and the shared domain engine through @itera/core, and the compatibility shims
// left at the old `@/types/*`, `@/domain/*`, `@/lib/*` and `@/data/repository`
// paths must be re-exports of that one module rather than copies of it.
//
// Identity is the assertion that matters. A shim that redefined richText or
// computeStreak, or a bundler/test resolver that loaded @itera/core twice, would
// still typecheck and still behave correctly in isolation - and would then
// silently give the two platforms two implementations of the same contract,
// which is the exact failure the shared package exists to prevent. Reference
// equality is the only check that catches it, and it can only be made at
// runtime.
import { describe, expect, it } from 'vitest'
import * as core from '@itera/core'
import { CARD_SCHEMA_VERSION as shimVersion, richText as shimRichText } from '@/types/card'
import { computeStreak } from '@/domain/stats/streak'
import { reviewState } from '@/domain/scheduling/scheduler'
import { computeRetention } from '@/domain/stats/progressMetrics'
import { localDayIndex } from '@/domain/stats/calendarDay'
import { gradeMatching } from '@/domain/grading/matching'
import { parseBackup } from '@/domain/io/backup'
import { newId } from '@/lib/id'
import { qk } from '@/hooks/queryKeys'
import { getRepository } from '@/data'
import { leafDecks } from '@/features/library/collectionTree'

describe('@itera/core resolution', () => {
  it('resolves as a workspace package from the web app', () => {
    expect(typeof core.richText).toBe('function')
    expect(core.CARD_SCHEMA_VERSION).toBe(2)
  })

  it('is the same module instance the @/types shim re-exports', () => {
    expect(shimRichText).toBe(core.richText)
    expect(shimVersion).toBe(core.CARD_SCHEMA_VERSION)
  })

  it('still produces the unchanged RichContent shape', () => {
    expect(shimRichText('let x = 1')).toEqual({ format: 'markdown', value: 'let x = 1' })
  })
})

describe('@itera/core domain surface', () => {
  // One representative per contract Phase 0 ranks as highest-divergence-risk:
  // FSRS, retention eligibility, the streak, the DST-safe local day, a grader,
  // and backup validation. If any of these ever exists twice, this fails.
  it('is the same module instance the @/domain shims re-export', () => {
    expect(computeStreak).toBe(core.computeStreak)
    expect(reviewState).toBe(core.reviewState)
    expect(computeRetention).toBe(core.computeRetention)
    expect(localDayIndex).toBe(core.localDayIndex)
    expect(gradeMatching).toBe(core.gradeMatching)
    expect(parseBackup).toBe(core.parseBackup)
  })

  it('is the same module instance the @/lib shim re-exports', () => {
    expect(newId).toBe(core.newId)
  })

  // Query keys and the registry are the two pieces of shared state where a
  // second copy is not merely duplication but a silent correctness bug: two
  // `qk` objects would invalidate different caches, and two registries would
  // let one platform configure a backend the hooks never see.
  it('is the same query-key table the @/hooks shim re-exports', () => {
    expect(qk).toBe(core.qk)
  })

  it('is the same repository registry the @/data shim re-exports', () => {
    expect(getRepository).toBe(core.getRepository)
  })

  // The Library's Collection derivation moved to core precisely so a native
  // client cannot derive a second Library tree. The web path used to own a
  // one-line `leafDecks` delegation; it now resolves to the deck-tree function.
  it('resolves the Library collection helpers to core', () => {
    expect(leafDecks).toBe(core.leafDecks)
  })
})
