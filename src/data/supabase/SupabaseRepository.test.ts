import type { SupabaseClient } from '@supabase/supabase-js'
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
import { SupabaseRepository } from './SupabaseRepository'

// Focused on the whole-workspace import contract only, against a hand-rolled
// fake client: no live project, no network. What matters here is which requests
// the backend issues - and, for replace, that it issues none.

type Call = { table: string; op: 'upsert' | 'delete' | 'select'; rows?: unknown }

function fakeClient() {
  const calls: Call[] = []
  const sb = {
    from(table: string) {
      return {
        upsert(rows: unknown) {
          calls.push({ table, op: 'upsert', rows })
          return Promise.resolve({ error: null })
        },
        delete() {
          calls.push({ table, op: 'delete' })
          return { neq: () => Promise.resolve({ error: null }) }
        },
        select() {
          calls.push({ table, op: 'select' })
          return Promise.resolve({ data: [], error: null })
        },
      }
    },
  }
  return { sb: sb as unknown as SupabaseClient, calls }
}

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
    const { sb } = fakeClient()
    expect(new SupabaseRepository(sb).importGuarantee).toBe('best-effort')
  })

  // The core of the P1-1 fix on this backend: PostgREST cannot roll a
  // five-table clear back, so the clear must never happen.
  it('refuses replaceAll without issuing a single request', async () => {
    const { sb, calls } = fakeClient()
    const repo = new SupabaseRepository(sb)

    await expect(repo.replaceAll(snapshot())).rejects.toBeInstanceOf(ImportFailure)
    expect(calls).toEqual([])
  })

  it('reports the refusal as a validation failure that changed nothing', async () => {
    const { sb } = fakeClient()
    const error = await new SupabaseRepository(sb)
      .replaceAll(snapshot())
      .catch((e: unknown) => e as ImportFailure)

    expect(error.stage).toBe('validation')
    expect(error.workspaceUnchanged).toBe(true)
    expect(error.message).toMatch(/Merge instead/)
  })

  it('merges by upserting every table and deleting nothing', async () => {
    const { sb, calls } = fakeClient()
    await new SupabaseRepository(sb).mergeAll(snapshot())

    expect(calls.map((c) => `${c.op} ${c.table}`)).toEqual([
      'upsert cards',
      'upsert decks',
      'upsert drafts',
      'upsert review_logs',
      'upsert roadmaps',
    ])
  })

  it('wraps each entity as { id, data } the way the row schema expects', async () => {
    const { sb, calls } = fakeClient()
    await new SupabaseRepository(sb).mergeAll(snapshot())

    const cards = calls.find((c) => c.table === 'cards')
    expect(cards?.rows).toEqual([{ id: 'c1', data: expect.objectContaining({ id: 'c1' }) }])
  })
})
