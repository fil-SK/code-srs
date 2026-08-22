import { describe, expect, it } from 'vitest'
import type { Card } from '../../types'
import { fixtureCard, fixtureReviewLog } from '../../domain/io/backupFixtures'
import { cardRow, fakeSupabase, rpcCalls, tableWrites } from './fakeSupabaseClient'
import { SupabaseRepository } from './SupabaseRepository'

// The client half of audit §10 item 6 on this backend. What can be tested
// without a live project is the contract: which request the repository issues,
// with what payload, and that no client-side card-then-log sequence survives
// anywhere on this path. The transaction itself is Postgres's, and
// supabase/migrations/0004_review_commit_rpc.sql is unverified against a live
// database - docs/TODO.md records exactly what to check on the first real one.

const BEFORE = fixtureCard('recall', { id: 'c1', deckId: 'deck-1' })

function graded(): Card {
  return {
    ...BEFORE,
    updatedAt: 5_000,
    scheduling: { ...BEFORE.scheduling, reps: 1, due: 86_400_000, state: 'review' },
  }
}

const LOG = fixtureReviewLog({ id: 'log-1', cardId: 'c1', reviewedAt: 5_000 })

function withCard() {
  return fakeSupabase({ tables: { cards: [cardRow(BEFORE)], review_logs: [] } })
}

describe('SupabaseRepository — atomic review persistence', () => {
  it('declares a transactional review guarantee, matching the local backend', () => {
    const { sb } = fakeSupabase()
    expect(new SupabaseRepository(sb).reviewGuarantee).toBe('transactional')
  })

  it('commits a review as one commit_review call carrying both entities', async () => {
    const { sb, requests } = withCard()
    const card = graded()

    await new SupabaseRepository(sb).commitReview({ card, log: LOG })

    const calls = rpcCalls(requests)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('commit_review')
    expect(calls[0].args).toEqual({
      p_card_id: 'c1',
      p_card: card,
      p_log_id: 'log-1',
      p_log: LOG,
    })
  })

  // The regression that matters: `cards.put()` followed by `reviews.append()` is
  // two committed statements, which is the inconsistency the RPC exists to
  // remove. No fallback to that sequence may survive on this path.
  it('issues no table writes at all when committing a review', async () => {
    const { sb, requests } = withCard()

    await new SupabaseRepository(sb).commitReview({ card: graded(), log: LOG })

    expect(tableWrites(requests)).toEqual([])
  })

  it('lands both the advanced card and the log', async () => {
    const { sb, tables } = withCard()

    await new SupabaseRepository(sb).commitReview({ card: graded(), log: LOG })

    expect((tables.cards[0].data as Card).scheduling.reps).toBe(1)
    expect(tables.cards[0].due).toBe(86_400_000)
    expect(tables.review_logs.map((r) => r.id)).toEqual(['log-1'])
  })

  it('rejects when the function errors, and writes nothing', async () => {
    const { sb, tables } = fakeSupabase({
      tables: { cards: [cardRow(BEFORE)], review_logs: [] },
      failRpc: 'commit_review',
    })

    await expect(
      new SupabaseRepository(sb).commitReview({ card: graded(), log: LOG }),
    ).rejects.toThrow(/commit_review failed/)

    expect((tables.cards[0].data as Card).scheduling.reps).toBe(0)
    expect(tables.review_logs).toEqual([])
  })

  // The function raises when its `update ... where id = $1` matches no row,
  // which under RLS also covers a card belonging to someone else.
  it('rejects when the card is not available to this user', async () => {
    const { sb, tables } = fakeSupabase({ tables: { cards: [], review_logs: [] } })

    await expect(
      new SupabaseRepository(sb).commitReview({ card: graded(), log: LOG }),
    ).rejects.toThrow(/not available to this user/)

    expect(tables.review_logs).toEqual([])
  })

  // `insert ... on conflict (id) do nothing`: a retry of an identical result
  // after a lost response must not become a second review.
  it('is idempotent when the same result is committed twice', async () => {
    const { sb, tables } = withCard()
    const repo = new SupabaseRepository(sb)

    await repo.commitReview({ card: graded(), log: LOG })
    await repo.commitReview({ card: graded(), log: LOG })

    expect(tables.review_logs.map((r) => r.id)).toEqual(['log-1'])
    expect((tables.cards[0].data as Card).scheduling.reps).toBe(1)
  })
})

describe('SupabaseRepository — atomic undo', () => {
  it('reverts a review as one revert_review call', async () => {
    const { sb, requests, tables } = withCard()
    const repo = new SupabaseRepository(sb)
    await repo.commitReview({ card: graded(), log: LOG })

    await repo.revertReview({ card: BEFORE, logId: 'log-1' })

    const calls = rpcCalls(requests, 'revert_review')
    expect(calls).toHaveLength(1)
    expect(calls[0].args).toEqual({ p_card_id: 'c1', p_card: BEFORE, p_log_id: 'log-1' })
    expect(tables.cards[0].data).toEqual(BEFORE)
    expect(tables.review_logs).toEqual([])
    expect(tableWrites(requests)).toEqual([])
  })

  it('rejects when the function errors, leaving the graded state intact', async () => {
    const { sb, tables } = fakeSupabase({
      tables: { cards: [cardRow(graded())], review_logs: [] },
      failRpc: 'revert_review',
    })

    await expect(
      new SupabaseRepository(sb).revertReview({ card: BEFORE, logId: 'log-1' }),
    ).rejects.toThrow(/revert_review failed/)

    expect((tables.cards[0].data as Card).scheduling.reps).toBe(1)
  })
})
