import { describe, expect, it } from 'vitest'
import {
  BACKUP_VERSION,
  buildBackup,
  parseBackup,
  serializeBackup,
  type BackupData,
} from './backup'

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

  it('rejects invalid JSON', () => {
    expect(() => parseBackup('{not json')).toThrow(/valid JSON/)
  })

  it('rejects files from another app', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'anki', version: 1 }))).toThrow(
      /code-srs backup/,
    )
  })

  it('rejects a newer version', () => {
    const future = JSON.stringify({ app: 'code-srs', version: 999, data: empty })
    expect(() => parseBackup(future)).toThrow(/newer/)
  })

  it('rejects missing data lists', () => {
    const bad = JSON.stringify({ app: 'code-srs', version: 1, data: { cards: [] } })
    expect(() => parseBackup(bad)).toThrow(/decks/)
  })
})
