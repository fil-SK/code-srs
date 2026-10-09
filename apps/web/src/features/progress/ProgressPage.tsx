import { useMemo, useState } from 'react'
import {
  buildCardDeckMap, buildRange, computeAchievements, computeDeckPerformance, computeHeatmap,
  computeKpis, computeMomentum, computeRetentionSeries, formatRangeLabel,
  heatmapDaysFor, previousPeriod, subtreeIds, useDecks, useDueCards, useReviewLogs, useSearchCards,
  type DateRangePreset, type HeatmapRangeValue,
} from '@fliptap/core'
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton'
import { ProgressShell } from './ProgressShell'
import { KpiDelta } from './components/KpiTile'
import { DateRangePicker } from './components/DateRangePicker'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { RetentionChart } from './components/RetentionChart'
import { DeckPerformanceTable } from './components/DeckPerformanceTable'
import { Achievements } from './components/Achievements'
import { DueCard, SecondaryMetrics, StreakCard } from './components/ProgressHeadline'
import './progress.css'

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
  const kpis = useMemo(() => computeKpis(cardsQuery.data ?? [], dueCardsQuery.data ?? [], logsQuery.data ?? [], range, now),
    [cardsQuery.data, dueCardsQuery.data, logsQuery.data, range, now])
  const momentum = useMemo(() => computeMomentum(logsQuery.data ?? [], now, kpis.due), [logsQuery.data, now, kpis.due])
  const heatmapDays = useMemo(() => computeHeatmap(logsQuery.data ?? [], heatmapDaysFor(heatmapRange), now), [logsQuery.data, heatmapRange, now])
  const cardDecks = useMemo(() => buildCardDeckMap(cardsQuery.data ?? []), [cardsQuery.data])
  const retentionDeckIds = useMemo(() => deckScope === 'all' ? undefined : new Set(subtreeIds(decksQuery.data ?? [], deckScope)), [deckScope, decksQuery.data])
  const retentionPoints = useMemo(() => computeRetentionSeries(logsQuery.data ?? [], range, cardDecks, retentionDeckIds), [logsQuery.data, range, cardDecks, retentionDeckIds])
  // The headline and comparison follow the chart's deck scope. Rates come from
  // eligible attempts, never an unweighted average of plotted buckets.
  const scopedRetention = useMemo(() => {
    if (!retentionDeckIds) return kpis.retention
    const logs = (logsQuery.data ?? []).filter((log) => {
      const deckId = cardDecks.get(log.cardId)
      return deckId !== undefined && retentionDeckIds.has(deckId)
    })
    return computeKpis(cardsQuery.data ?? [], dueCardsQuery.data ?? [], logs, range, now).retention
  }, [retentionDeckIds, kpis.retention, logsQuery.data, cardDecks, cardsQuery.data, dueCardsQuery.data, range, now])
  const deckPerformance = useMemo(() => computeDeckPerformance(logsQuery.data ?? [], cardsQuery.data ?? [], dueCardsQuery.data ?? [], decksQuery.data ?? [], range),
    [logsQuery.data, cardsQuery.data, dueCardsQuery.data, decksQuery.data, range])
  const achievements = useMemo(() => computeAchievements(logsQuery.data ?? [], now), [logsQuery.data, now])
  const decksById = useMemo(() => new Map((decksQuery.data ?? []).map((d) => [d.id, d])), [decksQuery.data])
  const deckOptions = useMemo(() => [...(decksQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ value: d.id, label: d.name })), [decksQuery.data])
  const loading = logsQuery.isLoading || cardsQuery.isLoading || dueCardsQuery.isLoading || decksQuery.isLoading

  return (
    <ProgressShell>
      <div className="progress-overview space-y-3.5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-1">
          <div>
            <h1 className="font-fliptap-display text-[34px] font-bold leading-tight tracking-tight text-fliptap-ink-brand">Your progress</h1>
            <p className="mt-1 text-sm text-fliptap-muted">Track your learning. Build lasting knowledge.</p>
          </div>
          <DateRangePicker preset={preset} range={range} onChange={setPreset} />
        </div>
        {loading ? (
          <LoadingRegion label="Loading your progress" className="space-y-3.5">
            <div className="progress-headline">
              <Skeleton className="progress-retention h-[300px] rounded-fliptap-card" />
              <Skeleton className="h-[300px] rounded-fliptap-card" />
              <Skeleton className="h-[300px] rounded-fliptap-card" />
              <div className="progress-secondary"><Skeleton className="min-h-[130px] rounded-fliptap-card" /><Skeleton className="min-h-[130px] rounded-fliptap-card" /></div>
            </div>
            <div className="progress-lower">
              <Skeleton className="h-[300px] rounded-fliptap-card" />
              <Skeleton className="h-[300px] rounded-fliptap-card" />
              <Skeleton className="progress-achievements h-[330px] rounded-fliptap-card" />
            </div>
          </LoadingRegion>
        ) : (
          <>
            <div className="progress-headline">
              <RetentionChart points={retentionPoints} deckOptions={deckOptions} selectedDeckId={deckScope} onDeckChange={setDeckScope}
                value={scopedRetention.value}
                footer={<KpiDelta delta={scopedRetention.deltaPp} comparisonLabel={comparisonLabel} unit="percentagePoints" />} />
              <StreakCard kpis={kpis} momentum={momentum} />
              <DueCard due={kpis.due} />
              <SecondaryMetrics kpis={kpis} comparisonLabel={comparisonLabel} />
            </div>
            <div className="progress-lower">
              <ActivityHeatmap days={heatmapDays} rangeValue={heatmapRange} onRangeChange={setHeatmapRange} />
              <DeckPerformanceTable rows={deckPerformance} decksById={decksById} />
              <div className="progress-achievements"><Achievements achievements={achievements} /></div>
            </div>
          </>
        )}
      </div>
    </ProgressShell>
  )
}
