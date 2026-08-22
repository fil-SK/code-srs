import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Card, Deck, Draft, ReviewLog, Roadmap } from '../../types'

// A chainable stand-in for the Supabase query builder, kept in core *source*
// rather than under packages/core/src/test/ on purpose. A fake written inline in
// a test file, or parked in the test directory, can drift from the real client
// and from supabase/schema.sql without anything failing: platformNeutrality.test
// skips both, and so does tsconfig.core.json's no-DOM/no-Node compile. Living
// here keeps it inside every guard the shipped code answers to (the same reason
// domain/io/backupFixtures.ts sits outside the tests). Nothing in an application
// imports it, and it is deliberately absent from the package barrel.
//
// It exists because SupabaseRepository's reads cannot be judged from their
// results alone - what matters is the sequence of requests they issue - and
// because the defect this models (audit P1-4) is a *successful* response that is
// short. So the fake reproduces the two PostgREST behaviours the repository has
// to survive:
//
//  - "Max rows": every response is truncated to `maxRows` no matter how large a
//    range was asked for, with a 200 and no error.
//  - the Content-Range total, exposed as `count`, which counts every matching
//    row rather than the ones in the page.
//
// Generated columns are computed here exactly as supabase/schema.sql declares
// them, so the fake can never be more forgiving than Postgres.

export interface FakeRow {
  id: string
  data: unknown
  [column: string]: unknown
}

export interface FakeFilter {
  op: 'eq' | 'neq' | 'lte' | 'gte'
  column: string
  value: unknown
}

export interface FakeOrder {
  column: string
  ascending: boolean
}

// One request the repository actually issued, recorded after it was awaited so
// the record is the finished query, not a half-built chain.
export interface FakeRequest {
  // For an rpc call this is the function name rather than a table: an RPC is
  // one request like any other, and callers assert on `requests` as a whole.
  table: string
  op: 'select' | 'upsert' | 'insert' | 'delete' | 'rpc'
  filters: FakeFilter[]
  order: FakeOrder[]
  range?: { from: number; to: number }
  count?: 'exact'
  single?: boolean
  rows?: unknown
  args?: Record<string, unknown>
}

export interface FakeSupabaseOptions {
  // Seed data, keyed by table name. Build rows with cardRow/reviewLogRow/entityRow.
  tables?: Record<string, FakeRow[]>
  // The project's API "Max rows" setting: the hard ceiling on one response,
  // applied after the requested range. Default: unlimited.
  maxRows?: number
  // Whether the response reports the exact total. False models a response
  // without a usable Content-Range total, forcing empty-page termination.
  reportCount?: boolean
  // 1-based index of the select request that fails, the way a network or RLS
  // error arrives mid-pagination.
  failSelectAt?: number
  // Make every call to this function reject, the way a raised exception inside
  // the function or a lost connection arrives. The transaction it models never
  // half-applies, so no row changes.
  failRpc?: string
}

export interface FakeSupabase {
  sb: SupabaseClient
  requests: FakeRequest[]
  tables: Record<string, FakeRow[]>
}

// supabase/schema.sql:
//   cards.deck_id   generated always as (data ->> 'deckId')
//   cards.due       generated always as ((data -> 'scheduling' ->> 'due')::bigint)
//   cards.suspended generated always as ((data ->> 'suspended')::boolean)
//   review_logs.card_id     generated always as (data ->> 'cardId')
//   review_logs.reviewed_at generated always as ((data ->> 'reviewedAt')::bigint)
// A missing key yields NULL, not a default - that asymmetry is real and is left
// visible here rather than smoothed away.
function generatedColumns(table: string, data: unknown): Record<string, unknown> {
  const entity = (data ?? {}) as Record<string, unknown>
  if (table === 'cards') {
    const scheduling = (entity.scheduling ?? {}) as Record<string, unknown>
    return {
      deck_id: entity.deckId ?? null,
      due: scheduling.due ?? null,
      suspended: 'suspended' in entity ? Boolean(entity.suspended) : null,
    }
  }
  if (table === 'review_logs') {
    return {
      card_id: entity.cardId ?? null,
      reviewed_at: entity.reviewedAt ?? null,
    }
  }
  return {}
}

function toRow(table: string, id: string, data: unknown): FakeRow {
  return { id, data, ...generatedColumns(table, data) }
}

export function cardRow(card: Card): FakeRow {
  return toRow('cards', card.id, card)
}

export function reviewLogRow(log: ReviewLog): FakeRow {
  return toRow('review_logs', log.id, log)
}

// decks, drafts and roadmaps have no generated columns.
export function entityRow(entity: Deck | Draft | Roadmap): FakeRow {
  return toRow('decks', entity.id, entity)
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  // NULLs sort first, matching Postgres's default for ascending order.
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  const left = a as number | string
  const right = b as number | string
  return left < right ? -1 : left > right ? 1 : 0
}

// SQL three-valued logic: a comparison against NULL is never true, which is
// what makes `.eq('suspended', false)` skip cards with no `suspended` key.
function matches(row: FakeRow, filter: FakeFilter): boolean {
  const value = row[filter.column]
  if (value === null || value === undefined) return false
  switch (filter.op) {
    case 'eq':
      return value === filter.value
    case 'neq':
      return value !== filter.value
    case 'lte':
      return compare(value, filter.value) <= 0
    case 'gte':
      return compare(value, filter.value) >= 0
  }
}

function postgrestError(message: string): PostgrestError {
  return {
    name: 'PostgrestError',
    message,
    details: '',
    hint: '',
    code: 'PGRST000',
  } as PostgrestError
}

export function fakeSupabase(options: FakeSupabaseOptions = {}): FakeSupabase {
  const tables: Record<string, FakeRow[]> = { ...(options.tables ?? {}) }
  const maxRows = options.maxRows ?? Number.POSITIVE_INFINITY
  const reportCount = options.reportCount ?? true
  const requests: FakeRequest[] = []
  let selects = 0

  function rowsOf(table: string): FakeRow[] {
    const existing = tables[table]
    if (existing) return existing
    const created: FakeRow[] = []
    tables[table] = created
    return created
  }

  function runSelect(req: FakeRequest) {
    selects += 1
    requests.push(req)
    if (options.failSelectAt === selects) {
      return {
        data: null,
        count: null,
        error: postgrestError(`select #${selects} on ${req.table} failed`),
        status: 500,
        statusText: 'Internal Server Error',
      }
    }

    const matching = rowsOf(req.table).filter((row) =>
      req.filters.every((f) => matches(row, f)),
    )
    // Stable sort: equal keys keep insertion order, as a Postgres index scan
    // would keep heap order. The repository must not depend on that, which is
    // why every paginated query carries its own unique tie-breaker.
    const sorted = [...matching].sort((a, b) => {
      for (const { column, ascending } of req.order) {
        const c = compare(a[column], b[column])
        if (c !== 0) return ascending ? c : -c
      }
      return 0
    })

    const windowed = req.range ? sorted.slice(req.range.from, req.range.to + 1) : sorted
    // The cap the client cannot see: a full-looking 200 that is short.
    const page = windowed.slice(0, maxRows)

    return {
      data: req.single ? ((page[0] ?? null) as unknown) : page,
      count: reportCount ? matching.length : null,
      error: null,
      status: 200,
      statusText: 'OK',
    }
  }

  function selectBuilder(req: FakeRequest) {
    const filter = (op: FakeFilter['op']) => (column: string, value: unknown) => {
      req.filters.push({ op, column, value })
      return builder
    }
    const builder = {
      eq: filter('eq'),
      neq: filter('neq'),
      lte: filter('lte'),
      gte: filter('gte'),
      order(column: string, opts?: { ascending?: boolean }) {
        req.order.push({ column, ascending: opts?.ascending ?? true })
        return builder
      },
      range(from: number, to: number) {
        req.range = { from, to }
        return builder
      },
      maybeSingle() {
        req.single = true
        return Promise.resolve(runSelect(req))
      },
      then<TResult>(
        onfulfilled?: (value: ReturnType<typeof runSelect>) => TResult | PromiseLike<TResult>,
      ) {
        return Promise.resolve(runSelect(req)).then(onfulfilled)
      },
    }
    return builder
  }

  function write(table: string, op: 'upsert' | 'insert', rows: unknown) {
    requests.push({ table, op, filters: [], order: [], rows })
    const entries = (Array.isArray(rows) ? rows : [rows]) as { id: string; data: unknown }[]
    const stored = rowsOf(table)
    for (const entry of entries) {
      const row = toRow(table, entry.id, entry.data)
      const at = stored.findIndex((r) => r.id === entry.id)
      if (at >= 0) stored[at] = row
      else stored.push(row)
    }
    return Promise.resolve({ data: null, count: null, error: null, status: 201, statusText: 'Created' })
  }

  function deleteBuilder(table: string) {
    const req: FakeRequest = { table, op: 'delete', filters: [], order: [] }
    const apply = (op: FakeFilter['op']) => (column: string, value: unknown) => {
      req.filters.push({ op, column, value })
      requests.push(req)
      const stored = rowsOf(table)
      const kept = stored.filter((row) => !req.filters.every((f) => matches(row, f)))
      stored.length = 0
      stored.push(...kept)
      return Promise.resolve({ data: null, count: null, error: null, status: 204, statusText: 'No Content' })
    }
    return { eq: apply('eq'), neq: apply('neq') }
  }

  // supabase/schema.sql's commit_review / revert_review, modelled at the level
  // that matters to the repository: both statements apply, or neither does.
  // The functions are plpgsql inside PostgREST's per-request transaction, so a
  // raise anywhere in the body rolls the whole call back - which is exactly the
  // guarantee SupabaseRepository advertises and therefore the one worth faking.
  function runRpc(fn: string, args: Record<string, unknown>) {
    requests.push({ table: fn, op: 'rpc', filters: [], order: [], args })

    if (options.failRpc === fn) {
      return Promise.resolve({
        data: null,
        error: postgrestError(`${fn} failed`),
        status: 500,
        statusText: 'Internal Server Error',
      })
    }

    const cards = rowsOf('cards')
    const logs = rowsOf('review_logs')
    const cardId = args.p_card_id as string
    const logId = args.p_log_id as string
    const cardAt = cards.findIndex((r) => r.id === cardId)

    // `update ... where id = $1` matching zero rows, which the function turns
    // into a raise. Nothing is written, mirroring the rollback.
    if (cardAt < 0) {
      return Promise.resolve({
        data: null,
        error: postgrestError(`card ${cardId} is not available to this user`),
        status: 400,
        statusText: 'Bad Request',
      })
    }

    if (fn === 'commit_review') {
      cards[cardAt] = toRow('cards', cardId, args.p_card)
      // `on conflict (id) do nothing` - re-committing an identical result is a
      // no-op rather than a duplicate row.
      if (!logs.some((r) => r.id === logId)) {
        logs.push(toRow('review_logs', logId, args.p_log))
      }
    } else if (fn === 'revert_review') {
      cards[cardAt] = toRow('cards', cardId, args.p_card)
      const kept = logs.filter((r) => r.id !== logId)
      logs.length = 0
      logs.push(...kept)
    } else {
      return Promise.resolve({
        data: null,
        error: postgrestError(`function public.${fn} does not exist`),
        status: 404,
        statusText: 'Not Found',
      })
    }

    return Promise.resolve({ data: null, error: null, status: 204, statusText: 'No Content' })
  }

  const sb = {
    rpc: (fn: string, args: Record<string, unknown>) => runRpc(fn, args),
    from(table: string) {
      return {
        select(_columns?: string, opts?: { count?: 'exact' }) {
          return selectBuilder({
            table,
            op: 'select',
            filters: [],
            order: [],
            count: opts?.count,
          })
        },
        upsert: (rows: unknown) => write(table, 'upsert', rows),
        insert: (rows: unknown) => write(table, 'insert', rows),
        delete: () => deleteBuilder(table),
      }
    },
  }

  return { sb: sb as unknown as SupabaseClient, requests, tables }
}

// The select requests the repository issued, in order - the assertion surface
// for "did it page, and did it page correctly".
export function selectsOn(requests: FakeRequest[], table: string): FakeRequest[] {
  return requests.filter((r) => r.op === 'select' && r.table === table)
}

// The rpc calls the repository issued, in order.
export function rpcCalls(requests: FakeRequest[], fn?: string): FakeRequest[] {
  return requests.filter((r) => r.op === 'rpc' && (fn === undefined || r.table === fn))
}

// Every request that wrote through the table API. A review commit must produce
// none of these: a surviving cards.upsert + review_logs.insert pair would be the
// non-atomic sequence the RPC replaced.
export function tableWrites(requests: FakeRequest[]): FakeRequest[] {
  return requests.filter((r) => r.op === 'upsert' || r.op === 'insert' || r.op === 'delete')
}

export function rangesOf(requests: FakeRequest[], table: string): (string | undefined)[] {
  return selectsOn(requests, table).map((r) =>
    r.range ? `${r.range.from}-${r.range.to}` : undefined,
  )
}
