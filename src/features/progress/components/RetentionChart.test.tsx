// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { RetentionPoint } from '@/domain/stats/progressMetrics'
import { RetentionChart } from './RetentionChart'
import { buildRetentionLinePaths } from './retentionChartPath'

const points: RetentionPoint[] = [
  { bucketStart: 0, bucketEnd: 1, retention: 0.5 },
  { bucketStart: 1, bucketEnd: 2, retention: 0.75 },
  { bucketStart: 2, bucketEnd: 3, retention: null },
  { bucketStart: 3, bucketEnd: 4, retention: 0.6 },
  { bucketStart: 4, bucketEnd: 5, retention: 0.8 },
]

afterEach(() => cleanup())

describe('RetentionChart gaps', () => {
  it('creates separate paths around a missing bucket', () => {
    const paths = buildRetentionLinePaths(points)
    expect(paths).toHaveLength(2)
    expect(paths.every((path) => path.split('M').length === 2)).toBe(true)
    expect(paths.every((path) => path.includes('L'))).toBe(true)
  })

  it('renders one SVG path per consecutive data segment', () => {
    const { container } = render(
      <RetentionChart
        points={points}
        deckOptions={[]}
        selectedDeckId="all"
        onDeckChange={() => {}}
      />,
    )
    expect(container.querySelectorAll('[data-retention-segment="true"]')).toHaveLength(2)
  })
})
