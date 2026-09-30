// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/charts/retentionChartPath.ts and is published as @fliptap/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@fliptap/core'
// directly; this layer is transitional.

export {
  CHART_HEIGHT,
  CHART_WIDTH,
  PAD_X,
  buildRetentionGeometry,
  xFor,
  yFor,
} from '@fliptap/core'

export type { RetentionGeometry, RetentionMarker } from '@fliptap/core'
