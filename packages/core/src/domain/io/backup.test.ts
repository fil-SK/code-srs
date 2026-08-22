import { describe, expect, it } from 'vitest'
import {
  BACKUP_VERSION,
  buildBackup,
  parseBackup,
  serializeBackup,
  type BackupData,
} from './backup'
import {
  fixtureCard,
  fixtureCards,
  fixtureDeck,
  fixtureDraft,
  fixtureRoadmap,
} from './backupFixtures'
import type { ReviewLog } from '../../types'

const empty: BackupData = { cards: [], decks: [], drafts: [], reviewLogs: [] }

function reviewLog(): ReviewLog {
  return {
    id: 'review-1',
    cardId: 'card-recall',
    reviewedAt: 1,
    rating: 3,
    autoGraded: false,
    durationMs: 1_000,
    stabilityBefore: 1,
    stabilityAfter: 2,
    difficultyBefore: 5,
    difficultyAfter: 5,
    stateBefore: 'review',
    state: 'review',
    dueAfter: 2,
  }
}

describe('backup build/serialize/parse', () => {
  it('round-trips through serialize/parse', () => {
    const data: BackupData = {
      ...empty,
      decks: [{ id: 'd', name: 'C++', createdAt: 1, updatedAt: 1 }],
    }
    const json = serializeBackup(buildBackup(data))
    const parsed = parseBackup(json)
    expect(parsed.app).toBe('code-srs')
    expect(parsed.version).toBe(BACKUP_VERSION)
    expect(parsed.data.decks).toHaveLength(1)
  })

  // The shape the app itself exports, and the shape docs/prompts/ai-card-prompt.md
  // tells an external LLM to produce.
  it('round-trips a full v2 backup carrying one card of every interaction type', () => {
    const data: BackupData = { ...empty, decks: [fixtureDeck()], cards: fixtureCards() }
    const parsed = parseBackup(serializeBackup(buildBackup(data)))

    expect(parsed.data.cards).toHaveLength(6)
    expect(parsed.data.cards.map((c) => c.interaction.type).sort()).toEqual([
      'matching',
      'multiple_choice',
      'ordering',
      'recall',
      'walkthrough',
      'write_code',
    ])
  })

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow(/valid JSON/)
  })

  it('rejects files from another app', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'anki', version: 1 }))).toThrow(
      /Itera backup/,
    )
  })

  it('rejects a newer version', () => {
    const future = JSON.stringify({ app: 'code-srs', version: 999, data: empty })
    expect(() => parseBackup(future)).toThrow(/newer/)
  })

  it('rejects a prototype-era version 1 backup', () => {
    const old = JSON.stringify({ app: 'code-srs', version: 1, data: {} })
    expect(() => parseBackup(old)).toThrow(/unsupported prototype data format/)
  })

  it('rejects missing data lists', () => {
    const bad = JSON.stringify({ app: 'code-srs', version: 2, data: { cards: [] } })
    expect(() => parseBackup(bad)).toThrow(/decks/)
  })

  it('round-trips the required current ReviewLog contract', () => {
    const parsed = parseBackup(serializeBackup(buildBackup({ ...empty, reviewLogs: [reviewLog()] })))
    expect(parsed.data.reviewLogs[0].stateBefore).toBe('review')
  })

  it('rejects prototype ReviewLogs without stateBefore without a legacy fallback', () => {
    const { stateBefore: _stateBefore, ...prototypeLog } = reviewLog()
    const bad = serializeBackup(
      buildBackup({ ...empty, reviewLogs: [prototypeLog as never] }),
    )
    expect(() => parseBackup(bad)).toThrow(/ReviewLog 1.*stateBefore/)
  })

  it('rejects a card with an unsupported interaction type', () => {
    const card = { ...fixtureCard(), interaction: { type: 'mcq' } }
    const bad = serializeBackup(
      buildBackup({ ...empty, decks: [fixtureDeck()], cards: [card as never] }),
    )
    expect(() => parseBackup(bad)).toThrow(/unsupported interaction type "mcq"/)
  })

  it('rejects a card whose scheduling block would break the due query', () => {
    const card = { ...fixtureCard(), scheduling: { state: 'new' } }
    const bad = serializeBackup(
      buildBackup({ ...empty, decks: [fixtureDeck()], cards: [card as never] }),
    )
    expect(() => parseBackup(bad)).toThrow(/numeric "scheduling.due"/)
  })

  it('round-trips drafts and roadmaps', () => {
    const data: BackupData = {
      ...empty,
      drafts: [fixtureDraft()],
      roadmaps: [fixtureRoadmap()],
    }
    const parsed = parseBackup(serializeBackup(buildBackup(data)))
    expect(parsed.data.drafts[0].id).toBe('draft-1')
    expect(parsed.data.roadmaps?.[0].nodes).toHaveLength(2)
  })

  it('rejects a malformed draft before anything can be written', () => {
    const { id: _id, ...draft } = fixtureDraft()
    const bad = serializeBackup(buildBackup({ ...empty, drafts: [draft as never] }))
    expect(() => parseBackup(bad)).toThrow(/Draft 1 is missing a valid "id"/)
  })

  // The audit's reproduction file: valid everywhere except one keyless roadmap,
  // which used to survive parse and blow up after replace had cleared storage.
  it('rejects a roadmap without an id before anything can be written', () => {
    const bad = serializeBackup(
      buildBackup({ ...empty, roadmaps: [{ title: 'no id here' } as never] }),
    )
    expect(() => parseBackup(bad)).toThrow(/Roadmap 1 is missing a valid "id"/)
  })

  // roadmaps is optional (added after v2 shipped), but present-and-not-a-list
  // used to reach bulkPut unchecked.
  it('accepts a v2 backup with no roadmaps key at all', () => {
    const json = JSON.stringify({ app: 'code-srs', version: 2, data: empty })
    expect(() => parseBackup(json)).not.toThrow()
  })

  it('rejects a roadmaps value that is not a list', () => {
    const json = JSON.stringify({
      app: 'code-srs',
      version: 2,
      data: { ...empty, roadmaps: { id: 'r1' } },
    })
    expect(() => parseBackup(json)).toThrow(/invalid "roadmaps" list/)
  })

  it('rejects a malformed deck', () => {
    const bad = serializeBackup(
      buildBackup({ ...empty, decks: [{ id: 'd' } as never], cards: [] }),
    )
    expect(() => parseBackup(bad)).toThrow(/Deck 1 \("d"\)/)
  })

  // Referential integrity needs repository state under Merge, so it is checked
  // by the import layer (src/data/backup.ts), not here.
  it('does not reject an unresolved deck reference at parse time', () => {
    const card = fixtureCard('recall', { deckId: 'somewhere-else' })
    const json = serializeBackup(buildBackup({ ...empty, decks: [], cards: [card] }))
    expect(() => parseBackup(json)).not.toThrow()
  })
})
