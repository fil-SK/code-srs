import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fixtureCard,
  fixtureDeck,
  fixtureDraft,
  fixtureReviewLog,
  fixtureRoadmap,
} from '@/domain/io/backupFixtures'
import { serializeBackup } from '@/domain/io/backup'
import { cardRow, entityRow, fakeSupabase, reviewLogRow } from './fakeSupabaseClient'

// The worst consequence of audit P1-4 was not a wrong statistic: exportBackup
// calls five repository reads and writes whatever came back into a
// normal-looking file, so a truncated read produces a backup that is silently
// missing data and only fails the user on restore.
//
// This exercises the real exportBackup against a cloud repository whose every
// response is capped, rather than testing the reads in isolation - the point is
// that backup.ts needs no pagination awareness of its own for the file to be
// complete.

const CAP = 3
const COUNTS = { cards: 7, decks: 5, drafts: 4, roadmaps: 6, reviewLogs: 9 }

// Filled per test, before the repository is constructed: getRepository() builds
// the backend lazily on its first call, which happens inside exportBackup.
const supabase = vi.hoisted(() => ({ client: null as unknown }))

// The suite blanks VITE_SUPABASE_* to stay hermetic, so isSupabaseConfigured is
// false at module scope and the cloud branch is otherwise unreachable from a
// test (the pattern established for the auth-mode suites, decision D253).
vi.mock('@/data/supabase/client', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => supabase.client,
}))

function pad(i: number): string {
  return String(i).padStart(3, '0')
}

function seed() {
  return {
    cards: Array.from({ length: COUNTS.cards }, (_, i) =>
      cardRow(fixtureCard('recall', { id: `card-${pad(i)}` })),
    ),
    decks: Array.from({ length: COUNTS.decks }, (_, i) =>
      entityRow(fixtureDeck({ id: `deck-${pad(i)}` })),
    ),
    drafts: Array.from({ length: COUNTS.drafts }, (_, i) =>
      entityRow(fixtureDraft({ id: `draft-${pad(i)}` })),
    ),
    roadmaps: Array.from({ length: COUNTS.roadmaps }, (_, i) =>
      entityRow(fixtureRoadmap({ id: `roadmap-${pad(i)}` })),
    ),
    review_logs: Array.from({ length: COUNTS.reviewLogs }, (_, i) =>
      reviewLogRow(fixtureReviewLog({ id: `log-${pad(i)}`, reviewedAt: 1_000 + i })),
    ),
  }
}

async function exportAgainstCappedCloud() {
  const { sb } = fakeSupabase({ tables: seed(), maxRows: CAP })
  supabase.client = sb
  // Fresh module registry so data/index's lazily cached repository is built
  // from the mocked client rather than a Dexie instance left by another test.
  const { exportBackup } = await import('@/data/backup')
  return exportBackup()
}

describe('exportBackup on a row-capped Supabase project', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports every entity even though each response is capped', async () => {
    const backup = await exportAgainstCappedCloud()

    expect(backup.data.cards).toHaveLength(COUNTS.cards)
    expect(backup.data.decks).toHaveLength(COUNTS.decks)
    expect(backup.data.drafts).toHaveLength(COUNTS.drafts)
    expect(backup.data.reviewLogs).toHaveLength(COUNTS.reviewLogs)
    expect(backup.data.roadmaps).toHaveLength(COUNTS.roadmaps)
  })

  // Review logs are the table that outgrows a row cap first, so they get the
  // identity check rather than only a count.
  it('exports the review history entire, not just its first page', async () => {
    const backup = await exportAgainstCappedCloud()

    expect(backup.data.reviewLogs.map((l) => l.id)).toEqual(
      Array.from({ length: COUNTS.reviewLogs }, (_, i) => `log-${pad(i)}`),
    )
  })

  it('writes a file whose contents match the workspace', async () => {
    const backup = await exportAgainstCappedCloud()
    const file = serializeBackup(backup)

    expect(file).toContain('log-008')
    expect(file).toContain('card-006')
    expect(file).toContain('roadmap-005')
  })

  it('cannot be satisfied by the cap alone', async () => {
    // Guards the fixture itself: if every table fitted in one response the test
    // above would pass against the unpaginated backend it exists to catch.
    expect(Math.max(...Object.values(COUNTS))).toBeGreaterThan(CAP)
  })
})
