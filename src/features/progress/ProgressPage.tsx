import { useMemo, useState } from 'react'
import { Clock3, CopyCheck, GraduationCap, RefreshCw } from 'lucide-react'
import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'
import { useReviewLogs } from '@/hooks/useReview'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'
import { subtreeIds } from '@/domain/decks/tree'
import { buildRange, formatRangeLabel, previousPeriod, type DateRangePreset } from '@/domain/stats/dateRange'
import { buildCardDeckMap } from '@/domain/stats/cardDeckIndex'
import {
  computeKpis,
  computeHeatmap,
  computeReviewSeries,
  computeRetentionSeries,
  computeDeckPerformance,
  deriveMilestones,
  heatmapDaysFor,
  type HeatmapRangeValue,
} from '@/domain/stats/progressMetrics'
import { ProgressShell } from './ProgressShell'
import { KpiTile, KpiDelta } from './components/KpiTile'
import { DateRangePicker } from './components/DateRangePicker'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { RetentionChart } from './components/RetentionChart'
import { DeckPerformanceTable } from './components/DeckPerformanceTable'
import { RecentMilestones } from './components/RecentMilestones'

export function ProgressPage() {
  const now = useMemo(() => Date.now(), [])
  const logsQuery = useReviewLogs()
  const cardsQuery = useSearchCards({ includeSuspended: true })
  const dueCardsQuery = useDueCards({ now })
  const decksQuery = useDecks()

  const [preset, setPreset] = useState<DateRangePreset>('30d')
  const [heatmapRange, setHeatmapRange] = useState<HeatmapRangeValue>('30d')
  const [deckScope, setDeckScope] = useState('all')

  const range = useMemo(() => buildRange(preset), [preset])
  const comparisonLabel = useMemo(() => formatRangeLabel(previousPeriod(range)), [range])

  const kpis = useMemo(
    () =>
      computeKpis(
        cardsQuery.data ?? [],
        dueCardsQuery.data ?? [],
        logsQuery.data ?? [],
        range,
        now,
      ),
    [cardsQuery.data, dueCardsQuery.data, logsQuery.data, range, now],
  )
  const reviewsSparkline = useMemo(
    () => computeReviewSeries(logsQuery.data ?? [], range).map((point) => point.count),
    [logsQuery.data, range],
  )
  const heatmapDays = useMemo(
    () => computeHeatmap(logsQuery.data ?? [], heatmapDaysFor(heatmapRange)),
    [logsQuery.data, heatmapRange],
  )
  const cardDecks = useMemo(() => buildCardDeckMap(cardsQuery.data ?? []), [cardsQuery.data])
  const retentionDeckIds = useMemo(
    () =>
      deckScope === 'all'
        ? undefined
        : new Set(subtreeIds(decksQuery.data ?? [], deckScope)),
    [deckScope, decksQuery.data],
  )
  const retentionPoints = useMemo(
    () =>
      computeRetentionSeries(
        logsQuery.data ?? [],
        range,
        cardDecks,
        retentionDeckIds,
      ),
    [logsQuery.data, range, cardDecks, retentionDeckIds],
  )
  const deckPerformance = useMemo(
    () =>
      computeDeckPerformance(
        logsQuery.data ?? [],
        cardsQuery.data ?? [],
        dueCardsQuery.data ?? [],
        decksQuery.data ?? [],
        range,
      ),
    [logsQuery.data, cardsQuery.data, dueCardsQuery.data, decksQuery.data, range],
  )
  const milestones = useMemo(() => deriveMilestones(logsQuery.data ?? []), [logsQuery.data])

  const decksById = useMemo(
    () => new Map((decksQuery.data ?? []).map((d) => [d.id, d])),
    [decksQuery.data],
  )
  const deckOptions = useMemo(
    () =>
      [...(decksQuery.data ?? [])]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => ({ value: d.id, label: d.name })),
    [decksQuery.data],
  )

  if (
    logsQuery.isLoading ||
    cardsQuery.isLoading ||
    dueCardsQuery.isLoading ||
    decksQuery.isLoading
  ) {
    return <p className="text-sm text-itera-muted">Loading…</p>
  }

  return (
    <ProgressShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-itera-display text-3xl font-bold text-itera-ink-brand">Your progress</h1>
            <p className="mt-1 text-sm text-itera-muted">Track your learning. Build lasting knowledge.</p>
          </div>
          <DateRangePicker preset={preset} range={range} onChange={setPreset} />
        </div>

        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KpiTile
                icon={GraduationCap}
                label="Learned"
                value={kpis.learned.value.toLocaleString()}
                variant="dark"
                footer={
                  <span className="text-white/60">
                    {kpis.learned.value.toLocaleString()} of {kpis.learned.total.toLocaleString()} active cards
                  </span>
                }
              />
              <KpiTile
                icon={Clock3}
                label="Due"
                value={kpis.due.toLocaleString()}
                iconTone="navy"
                footer={<span className="text-itera-muted">Due now</span>}
              />
              <KpiTile
                icon={CopyCheck}
                label="Reviews"
                value={kpis.reviews.value.toLocaleString()}
                iconTone="navy"
                sparkline={reviewsSparkline}
                footer={<KpiDelta delta={kpis.reviews.deltaPct} comparisonLabel={comparisonLabel} />}
              />
              <KpiTile
                icon={RefreshCw}
                label="Retention"
                value={kpis.retention.value === null ? '—' : `${Math.round(kpis.retention.value * 100)}%`}
                iconTone="success"
                footer={
                  <KpiDelta
                    delta={kpis.retention.deltaPp}
                    comparisonLabel={comparisonLabel}
                    unit="percentagePoints"
                  />
                }
              />
              <KpiTile
                icon={StreakFlameIcon}
                label="Current streak"
                value={`${kpis.streak} day${kpis.streak === 1 ? '' : 's'}`}
                iconTone="accent"
                footer={<span className="text-itera-muted">Best: {kpis.bestStreak} days</span>}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ActivityHeatmap days={heatmapDays} rangeValue={heatmapRange} onRangeChange={setHeatmapRange} />
              <RetentionChart
                points={retentionPoints}
                deckOptions={deckOptions}
                selectedDeckId={deckScope}
                onDeckChange={setDeckScope}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <DeckPerformanceTable rows={deckPerformance} decksById={decksById} />
              <RecentMilestones events={milestones} />
            </div>
          </>
      </div>
    </ProgressShell>
  )
}
