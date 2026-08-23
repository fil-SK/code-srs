// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/stats/progressMetrics.ts and is published as @itera/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@itera/core'
// directly; this layer is transitional.

export {
  HEATMAP_RANGE_OPTIONS,
  clusterSessions,
  computeDeckPerformance,
  computeHeatmap,
  computeKpis,
  computeRetention,
  computeRetentionSeries,
  computeReviewSeries,
  deriveMilestones,
  heatmapDaysFor,
} from '@itera/core'

export type {
  DeckPerformanceRow,
  HeatmapDay,
  HeatmapRangeValue,
  KpiSet,
  MilestoneEvent,
  MilestoneType,
  RetentionPoint,
  ReviewCountPoint,
  StudySessionSpan,
} from '@itera/core'
