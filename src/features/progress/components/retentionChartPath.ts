import type { RetentionPoint } from '@/domain/stats/progressMetrics'

// The retention chart's projection lives here rather than in the component so
// the line segments and the standalone markers cannot drift apart: both are
// produced by one pass over the same coordinates.
export const CHART_WIDTH = 640
export const CHART_HEIGHT = 200
export const PAD_X = 8
const PAD_TOP = 16
const PAD_BOTTOM = 24

export function xFor(i: number, count: number): number {
  if (count <= 1) return PAD_X
  return PAD_X + (i / (count - 1)) * (CHART_WIDTH - PAD_X * 2)
}

export function yFor(value: number): number {
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM
  return PAD_TOP + (1 - value) * plotHeight
}

/** One observed bucket, already projected into chart coordinates. */
export interface RetentionMarker {
  index: number
  x: number
  y: number
}

export interface RetentionGeometry {
  /** One `d` string per run of two or more adjacent observed buckets. */
  segments: string[]
  /** Observed buckets with no observed neighbour, which no segment can show. */
  isolated: RetentionMarker[]
}

// Missing retention buckets split the series. A gap is absence of evidence, so
// the chart must not interpolate a line across it - but an observation with no
// observed neighbour is still a real measurement, and dropping it (which the
// earlier paths-only build did) hid whole periods of history. A run of one
// becomes a point; a run of two or more becomes a line.
export function buildRetentionGeometry(points: RetentionPoint[]): RetentionGeometry {
  const segments: string[] = []
  const isolated: RetentionMarker[] = []
  let run: RetentionMarker[] = []

  function flush() {
    if (run.length === 1) {
      isolated.push(run[0])
    } else if (run.length >= 2) {
      segments.push(
        run
          .map((m, i) => `${i === 0 ? 'M' : 'L'} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`)
          .join(' '),
      )
    }
    run = []
  }

  points.forEach((point, index) => {
    if (point.retention === null) {
      flush()
      return
    }
    run.push({
      index,
      x: xFor(index, points.length),
      y: yFor(point.retention),
    })
  })
  flush()

  return { segments, isolated }
}
