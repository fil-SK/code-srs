import type { RetentionPoint } from '@/domain/stats/progressMetrics'

const WIDTH = 640
const HEIGHT = 200
const PAD_X = 8
const PAD_TOP = 16
const PAD_BOTTOM = 24

function xFor(i: number, count: number): number {
  if (count <= 1) return PAD_X
  return PAD_X + (i / (count - 1)) * (WIDTH - PAD_X * 2)
}

function yFor(value: number): number {
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  return PAD_TOP + (1 - value) * plotHeight
}

// Missing retention buckets split the path. A gap is absence of evidence, so
// the chart must not interpolate a line across it.
export function buildRetentionLinePaths(points: RetentionPoint[]): string[] {
  const paths: string[] = []
  let current: string[] = []

  function flush() {
    if (current.length >= 2) paths.push(current.join(' '))
    current = []
  }

  points.forEach((point, index) => {
    if (point.retention === null) {
      flush()
      return
    }
    const command = current.length === 0 ? 'M' : 'L'
    current.push(
      `${command} ${xFor(index, points.length).toFixed(1)} ${yFor(point.retention).toFixed(1)}`,
    )
  })
  flush()
  return paths
}
