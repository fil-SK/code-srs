// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/stats/dateRange.ts and is published as @itera/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@itera/core'
// directly; this layer is transitional.

export {
  DATE_RANGE_PRESETS,
  buildRange,
  formatEventDate,
  formatRangeLabel,
  formatTimeOfDay,
  previousPeriod,
  startOfDay,
} from '@itera/core'

export type { DateRange, DateRangePreset } from '@itera/core'
