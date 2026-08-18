import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ID, Rating } from '@/types'
import { cn } from '@/lib/cn'
import { useReviewLogs } from '@/hooks/useReview'
import { useSearchCards } from '@/hooks/useCards'
import { useSearchCardsV2 } from '@/hooks/useCardsV2'
import { useDecks } from '@/hooks/useDecks'
import { getCardTitle } from '@/features/cards/cardTypeMeta'
import { rowVisualFor } from '@/features/library/shared/rowVisuals'
import { EmptyState } from '@/features/library/shared/EmptyState'
import { CardListFooter } from '@/features/library/shared/CardListFooter'
import { RowFilterDropdown } from '@/features/library/shared/RowFilterDropdown'
import { formatEventDate, formatTimeOfDay } from '@/domain/stats/dateRange'
import { formatInterval } from '@/domain/scheduling/format'
import { buildCardDeckMap } from '@/domain/stats/cardDeckIndex'
import {
  buildHistoryRange,
  buildReviewHistory,
  HISTORY_RANGE_OPTIONS,
  type HistoryRangeValue,
} from '@/domain/stats/reviewHistory'
import { ProgressShell } from './ProgressShell'
import { SegmentedToggle } from './components/SegmentedToggle'
import { DeckScopeDropdown } from './components/DeckScopeDropdown'
import { RatingPill } from './components/RatingPill'

const PAGE_SIZE = 25

const RATING_OPTIONS = [
  { value: 'all', label: 'All ratings' },
  { value: '1', label: 'Again' },
  { value: '2', label: 'Hard' },
  { value: '3', label: 'Good' },
  { value: '4', label: 'Easy' },
]

// Same column rhythm as library/shared/CardTable: a CSS grid rather than a
// <table>, with a min-width so the fixed columns can't crush the card cell.
function gridClass() {
  return 'grid min-w-[720px] grid-cols-[minmax(220px,1fr)_160px_110px_90px_150px] items-center gap-2'
}

// A card's display label. Resolved here rather than in domain/stats, because
// getCardTitle and rowVisualFor live behind modules that pull in lucide and
// src/domain does not import from src/features.
interface CardLabel {
  title: string
  kind: 'v1' | 'v2'
  type: string
}

export function ReviewHistoryPage() {
  const logsQuery = useReviewLogs()
  const cardsQuery = useSearchCards({ includeSuspended: true })
  const cardsV2Query = useSearchCardsV2({ includeSuspended: true })
  const decksQuery = useDecks()

  const [rangeValue, setRangeValue] = useState<HistoryRangeValue>('30d')
  const [deckScope, setDeckScope] = useState('all')
  const [rating, setRating] = useState('all')
  const [page, setPage] = useState(1)

  // Frozen once per mount so "Today" and the range boundaries can't shift
  // mid-interaction, matching LibraryDeckPage/LibraryBrowserPage.
  const now = useMemo(() => Date.now(), [])

  const logs = logsQuery.data
  const decks = useMemo(() => decksQuery.data ?? [], [decksQuery.data])

  const cardDecks = useMemo(
    () => buildCardDeckMap(cardsQuery.data ?? [], cardsV2Query.data ?? []),
    [cardsQuery.data, cardsV2Query.data],
  )

  const cardLabels = useMemo(() => {
    const map = new Map<ID, CardLabel>()
    for (const c of cardsQuery.data ?? []) {
      map.set(c.id, { title: getCardTitle(c), kind: 'v1', type: c.type })
    }
    for (const c of cardsV2Query.data ?? []) {
      map.set(c.id, {
        title: c.prompt.value.split('\n')[0]?.trim() || '(untitled)',
        kind: 'v2',
        type: c.interaction.type,
      })
    }
    return map
  }, [cardsQuery.data, cardsV2Query.data])

  const deckNames = useMemo(() => new Map(decks.map((d) => [d.id, d.name])), [decks])

  const range = useMemo(() => buildHistoryRange(rangeValue, now), [rangeValue, now])

  const rows = useMemo(
    () =>
      buildReviewHistory(logs ?? [], cardDecks, decks, {
        range,
        deckId: deckScope === 'all' ? undefined : deckScope,
        rating: rating === 'all' ? undefined : (Number(rating) as Rating),
      }),
    [logs, cardDecks, decks, range, deckScope, rating],
  )

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  useEffect(() => setPage(1), [rangeValue, deckScope, rating])
  useEffect(() => setPage((c) => Math.min(c, totalPages)), [totalPages])

  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  )

  const deckOptions = useMemo(
    () => [
      { value: 'all', label: 'All decks' },
      ...[...decks]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => ({ value: d.id, label: d.name })),
    ],
    [decks],
  )

  if (
    logsQuery.isLoading ||
    cardsQuery.isLoading ||
    cardsV2Query.isLoading ||
    decksQuery.isLoading
  ) {
    return (
      <ProgressShell>
        <p className="text-sm text-itera-muted">Loading…</p>
      </ProgressShell>
    )
  }

  const hasAnyLogs = (logs ?? []).length > 0

  return (
    <ProgressShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-itera-display text-3xl font-bold text-itera-ink-brand">
            Review history
          </h1>
          <p className="mt-1 text-sm text-itera-muted">
            Every review you've logged, newest first.
          </p>
        </div>

        {!hasAnyLogs ? (
          <EmptyState
            title="No review history yet"
            description="Study a few cards and each review will be recorded here — the card, its deck, how you rated it, and when it comes back."
            action={
              <Link
                to="/review"
                className="inline-flex items-center justify-center rounded-[9px] bg-itera-accent px-4 py-2 text-sm font-semibold text-white hover:bg-itera-accent-hover"
              >
                Start reviewing
              </Link>
            }
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedToggle
                options={HISTORY_RANGE_OPTIONS}
                value={rangeValue}
                onChange={setRangeValue}
              />
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <DeckScopeDropdown
                  options={deckOptions}
                  value={deckScope}
                  onChange={setDeckScope}
                />
                <RowFilterDropdown
                  label="Rating"
                  options={RATING_OPTIONS}
                  value={rating}
                  onChange={setRating}
                />
              </div>
            </div>

            {rows.length === 0 ? (
              <EmptyState
                title="No reviews match"
                description="Try a wider date range, another deck, or a different rating."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <div className="px-2">
                    <div
                      className={cn(
                        gridClass(),
                        'pb-3 text-xs font-bold uppercase tracking-wider text-itera-muted',
                      )}
                    >
                      <span>Card</span>
                      <span>Deck</span>
                      <span>Rating</span>
                      <span>Interval</span>
                      <span>Reviewed</span>
                    </div>
                  </div>
                  <div className="rounded-itera-card border border-itera-border bg-itera-surface px-2">
                    <div className="divide-y divide-itera-border">
                      {pageRows.map((row) => {
                        const label = cardLabels.get(row.cardId)
                        const visual = label
                          ? rowVisualFor({ kind: label.kind, type: label.type })
                          : null
                        const Icon = visual?.icon
                        return (
                          <div
                            key={row.id}
                            className={cn(gridClass(), 'py-2.5 hover:bg-itera-surface-subtle')}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {visual && Icon ? (
                                <span
                                  className={cn(
                                    'grid h-5 w-5 flex-none place-items-center rounded text-white',
                                    visual.tileClass,
                                  )}
                                  title={visual.label}
                                >
                                  <Icon size={12} />
                                </span>
                              ) : (
                                <span className="h-5 w-5 flex-none rounded border border-dashed border-itera-border" />
                              )}
                              {label ? (
                                <Link
                                  to={`/cards/${row.cardId}/study`}
                                  className="truncate text-sm text-itera-ink hover:text-itera-ink-brand hover:underline"
                                >
                                  {label.title}
                                </Link>
                              ) : (
                                <span className="truncate text-sm italic text-itera-muted-light">
                                  (deleted card)
                                </span>
                              )}
                            </span>

                            <span className="truncate text-sm text-itera-muted">
                              {(row.deckId && deckNames.get(row.deckId)) || '—'}
                            </span>

                            <span>
                              <RatingPill rating={row.rating} />
                            </span>

                            <span className="text-sm tabular-nums text-itera-muted">
                              {row.dueAfter
                                ? formatInterval(row.reviewedAt, row.dueAfter)
                                : '—'}
                            </span>

                            <span className="text-sm text-itera-muted">
                              {formatEventDate(row.reviewedAt, now)} ·{' '}
                              {formatTimeOfDay(row.reviewedAt)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <CardListFooter
                  count={rows.length}
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={PAGE_SIZE}
                  itemLabel="review"
                  showTip={false}
                />
              </>
            )}
          </>
        )}
      </div>
    </ProgressShell>
  )
}
