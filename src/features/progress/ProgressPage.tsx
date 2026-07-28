import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, BookOpen, Flame, RefreshCcw, Star } from 'lucide-react'
import { useReviewLogs } from '@/hooks/useReview'
import { useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'
import { EmptyState } from '@/features/library/shared/EmptyState'
import { buildRange, formatRangeLabel, previousPeriod, type DateRangePreset } from '@/domain/stats/dateRange'
import {
  computeKpis,
  computeHeatmap,
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
  const logsQuery = useReviewLogs()
  const cardsQuery = useSearchCards({ includeSuspended: true })
  const decksQuery = useDecks()

  const [preset, setPreset] = useState<DateRangePreset>('30d')
  const [heatmapRange, setHeatmapRange] = useState<HeatmapRangeValue>('30d')
  const [deckScope, setDeckScope] = useState('all')

  const logs = logsQuery.data ?? []

  const range = useMemo(() => buildRange(preset), [preset])
  const comparisonLabel = useMemo(() => formatRangeLabel(previousPeriod(range)), [range])

  const kpis = useMemo(() => computeKpis(logsQuery.data ?? [], range), [logsQuery.data, range])
  const sessionsSparkline = useMemo(
    () => computeHeatmap(logsQuery.data ?? [], Math.min(range.days, 30)).map((d) => d.count),
    [logsQuery.data, range.days],
  )
  const heatmapDays = useMemo(
    () => computeHeatmap(logsQuery.data ?? [], heatmapDaysFor(heatmapRange)),
    [logsQuery.data, heatmapRange],
  )
  const retentionPoints = useMemo(
    () =>
      computeRetentionSeries(
        logsQuery.data ?? [],
        range,
        cardsQuery.data ?? [],
        deckScope === 'all' ? undefined : deckScope,
      ),
    [logsQuery.data, range, cardsQuery.data, deckScope],
  )
  const deckPerformance = useMemo(
    () => computeDeckPerformance(logsQuery.data ?? [], cardsQuery.data ?? [], range),
    [logsQuery.data, cardsQuery.data, range],
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

  if (logsQuery.isLoading || cardsQuery.isLoading || decksQuery.isLoading) {
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

        {logs.length === 0 ? (
          <EmptyState
            title="No review history yet"
            description="Study a few cards and your progress will show up here — sessions, retention, and streaks all come from real review activity."
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KpiTile
                icon={BarChart3}
                label="Total sessions"
                value={`${kpis.totalSessions.value}`}
                variant="dark"
                sparkline={sessionsSparkline}
                footer={<KpiDelta delta={kpis.totalSessions.deltaPct} comparisonLabel={comparisonLabel} dark />}
              />
              <KpiTile
                icon={BookOpen}
                label="Cards reviewed"
                value={kpis.cardsReviewed.value.toLocaleString()}
                footer={<KpiDelta delta={kpis.cardsReviewed.deltaPct} comparisonLabel={comparisonLabel} />}
              />
              <KpiTile
                icon={RefreshCcw}
                label="Retention rate"
                value={kpis.retention.value === null ? '—' : `${Math.round(kpis.retention.value * 100)}%`}
                footer={<KpiDelta delta={kpis.retention.deltaPp} comparisonLabel={comparisonLabel} />}
              />
              <KpiTile
                icon={Star}
                label="Avg. accuracy"
                value={kpis.accuracy.value === null ? '—' : `${Math.round(kpis.accuracy.value * 100)}%`}
                footer={<KpiDelta delta={kpis.accuracy.deltaPp} comparisonLabel={comparisonLabel} />}
              />
              <KpiTile
                icon={Flame}
                label="Current streak"
                value={`${kpis.streak} day${kpis.streak === 1 ? '' : 's'}`}
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
        )}
      </div>
    </ProgressShell>
  )
}
