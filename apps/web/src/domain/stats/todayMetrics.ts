// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/stats/todayMetrics.ts and is published as @itera/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@itera/core'
// directly; this layer is transitional.

export {
  DEFAULT_SECONDS_PER_CARD,
  MIN_DURATION_SAMPLE,
  buildContinueLearning,
  computePaceSeries,
  estimateSessionMinutes,
  nextDueAt,
  resolveSessionLimit,
  selectNextMilestone,
  summarizeDueQueue,
} from '@itera/core'

export type { ContinueRow, DueQueueSummary, NextMilestone, PaceDay } from '@itera/core'
