import { describe, expect, it } from 'vitest'
import {
  fixtureCard,
  fixtureDeck,
  fixtureDraft,
  fixtureReviewLog,
  fixtureRoadmap,
} from '@/domain/io/backupFixtures'
import { ImportFailure } from '@/domain/io/importFailure'
import type { WorkspaceSnapshot } from '../repository'
import { fakeSupabase } from './fakeSupabaseClient'
import { SupabaseRepository } from './SupabaseRepository'

// Focused on the whole-workspace import contract only, against the fake client
// in fakeSupabaseClient.ts: no live project, no network. What matters here is
// which requests the backend issues - and, for replace, that it issues none.
// The reads are covered in SupabaseRepository.reads.test.ts.

function snapshot(): WorkspaceSnapshot {
  return {
    cards: [fixtureCard('recall', { id: 'c1' })],
    decks: [fixtureDeck()],
    drafts: [fixtureDraft()],
    reviewLogs: [fixtureReviewLog()],
    roadmaps: [fixtureRoadmap()],
  }
}

describe('SupabaseRepository — whole-workspace import', () => {
  it('declares that it cannot write a workspace as one unit', () => {
    const { sb } = fakeSupabase()
    expect(new SupabaseRepository(sb).importGuarantee).toBe('best-effort')
  })

  // The core of the P1-1 fix on this backend: PostgREST cannot roll a
  // five-table clear back, so the clear must never happen.
  it('refuses replaceAll without issuing a single request', async () => {
    const { sb, requests } = fakeSupabase()
    const repo = new SupabaseRepository(sb)

    await expect(repo.replaceAll(snapshot())).rejects.toBeInstanceOf(ImportFailure)
    expect(requests).toEqual([])
  })

  it('reports the refusal as a validation failure that changed nothing', async () => {
    const { sb } = fakeSupabase()
    const error = await new SupabaseRepository(sb)
      .replaceAll(snapshot())
      .catch((e: unknown) => e as ImportFailure)

    expect(error.stage).toBe('validation')
    expect(error.workspaceUnchanged).toBe(true)
    expect(error.message).toMatch(/Merge instead/)
  })

  it('merges by upserting every table and deleting nothing', async () => {
    const { sb, requests } = fakeSupabase()
    await new SupabaseRepository(sb).mergeAll(snapshot())

    expect(requests.map((r) => `${r.op} ${r.table}`)).toEqual([
      'upsert cards',
      'upsert decks',
      'upsert drafts',
      'upsert review_logs',
      'upsert roadmaps',
    ])
  })

  it('wraps each entity as { id, data } the way the row schema expects', async () => {
    const { sb, requests } = fakeSupabase()
    await new SupabaseRepository(sb).mergeAll(snapshot())

    const cards = requests.find((r) => r.table === 'cards')
    expect(cards?.rows).toEqual([{ id: 'c1', data: expect.objectContaining({ id: 'c1' }) }])
  })
})
