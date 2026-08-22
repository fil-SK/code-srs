import { describe, expect, it } from 'vitest'
import {
  fixtureCard,
  fixtureDeck,
  fixtureDraft,
  fixtureReviewLog,
  fixtureRoadmap,
} from '../domain/io/backupFixtures'
import { buildBackup, serializeBackup } from '../domain/io/backup'
import { ImportFailure } from '../domain/io/importFailure'
import {
  cardRow,
  entityRow,
  fakeSupabase,
  reviewLogRow,
  tableWrites,
} from './supabase/fakeSupabaseClient'
import { SupabaseRepository } from './supabase/SupabaseRepository'
import { canReplaceImport, exportBackup, importBackup } from './backup'
import { rejection } from '../test/rejection'

// Backup orchestration against a real backend rather than a stub: these
// functions now take the repository they act on, so the suite constructs one
// and hands it over - no module mocking, no ambient singleton, no resetModules.
//
// The cloud backend is the interesting one to point them at. The worst
// consequence of audit P1-4 was not a wrong statistic: exportBackup calls five
// repository reads and writes whatever came back into a normal-looking file, so
// a truncated read produces a backup that is silently missing data and only
// fails the user on restore. Every response from this fake is capped, and the
// point is that backup.ts needs no pagination awareness of its own for the file
// to still be complete.

const CAP = 3
const COUNTS = { cards: 7, decks: 5, drafts: 4, roadmaps: 6, reviewLogs: 9 }

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

function cappedCloud() {
  const { sb, requests } = fakeSupabase({ tables: seed(), maxRows: CAP })
  return { repo: new SupabaseRepository(sb), requests }
}

describe('exportBackup on a row-capped Supabase project', () => {
  it('exports every entity even though each response is capped', async () => {
    const backup = await exportBackup(cappedCloud().repo)

    expect(backup.data.cards).toHaveLength(COUNTS.cards)
    expect(backup.data.decks).toHaveLength(COUNTS.decks)
    expect(backup.data.drafts).toHaveLength(COUNTS.drafts)
    expect(backup.data.reviewLogs).toHaveLength(COUNTS.reviewLogs)
    expect(backup.data.roadmaps).toHaveLength(COUNTS.roadmaps)
  })

  // Review logs are the table that outgrows a row cap first, so they get the
  // identity check rather than only a count.
  it('exports the review history entire, not just its first page', async () => {
    const backup = await exportBackup(cappedCloud().repo)

    expect(backup.data.reviewLogs.map((l) => l.id)).toEqual(
      Array.from({ length: COUNTS.reviewLogs }, (_, i) => `log-${pad(i)}`),
    )
  })

  it('writes a file whose contents match the workspace', async () => {
    const file = serializeBackup(await exportBackup(cappedCloud().repo))

    expect(file).toContain('log-008')
    expect(file).toContain('card-006')
    expect(file).toContain('roadmap-005')
  })

  it('cannot be satisfied by the cap alone', async () => {
    // Guards the fixture itself: if every table fitted in one response the test
    // above would pass against the unpaginated backend it exists to catch.
    expect(Math.max(...Object.values(COUNTS))).toBeGreaterThan(CAP)
  })

  // The repository is an argument, not something the module reaches for: two
  // different backends handed to the same function must produce two different
  // files. Nothing else here would notice if the parameter were ignored.
  it('reads the repository it was given rather than an ambient one', async () => {
    const populated = await exportBackup(cappedCloud().repo)
    const { sb } = fakeSupabase()
    const empty = await exportBackup(new SupabaseRepository(sb))

    expect(populated.data.cards).toHaveLength(COUNTS.cards)
    expect(empty.data.cards).toEqual([])
  })
})

describe('importBackup against a backend that cannot replace', () => {
  function file() {
    return buildBackup({
      cards: [fixtureCard('recall', { id: 'c1' })],
      decks: [fixtureDeck()],
      drafts: [fixtureDraft()],
      reviewLogs: [fixtureReviewLog()],
      roadmaps: [fixtureRoadmap()],
    })
  }

  it('does not offer Replace for a best-effort backend', () => {
    const { sb } = fakeSupabase()
    expect(canReplaceImport(new SupabaseRepository(sb))).toBe(false)
  })

  it('refuses a Replace import without deleting anything', async () => {
    const { repo, requests } = cappedCloud()

    const error = await rejection<ImportFailure>(importBackup(repo, file(), 'replace'))

    expect(error).toBeInstanceOf(ImportFailure)
    expect(error.workspaceUnchanged).toBe(true)
    expect(tableWrites(requests)).toEqual([])
  })

  // Validation stands in front of the write, not beside it: a card whose deck is
  // in neither the file nor the library must stop the import before a single row
  // is upserted. Merge is the mode where that check has to consult the
  // repository, which is exactly the argument under test.
  it('rejects an unresolved deck reference before writing a row', async () => {
    const { repo, requests } = cappedCloud()
    const orphaned = buildBackup({
      cards: [fixtureCard('recall', { id: 'c1', deckId: 'deck-that-exists-nowhere' })],
      decks: [],
      drafts: [],
      reviewLogs: [],
      roadmaps: [],
    })

    const error = await rejection<ImportFailure>(importBackup(repo, orphaned, 'merge'))

    expect(error.stage).toBe('validation')
    expect(error.message).toMatch(/or in your library/)
    expect(tableWrites(requests)).toEqual([])
  })
})
