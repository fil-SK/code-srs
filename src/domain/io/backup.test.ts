import { describe, expect, it } from 'vitest'
import {
  BACKUP_VERSION,
  buildBackup,
  parseBackup,
  serializeBackup,
  type BackupData,
} from './backup'
import { fixtureCard, fixtureCards, fixtureDeck } from './backupFixtures'

const empty: BackupData = { cards: [], decks: [], drafts: [], reviewLogs: [] }

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
