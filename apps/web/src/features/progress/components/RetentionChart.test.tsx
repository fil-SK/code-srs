// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { RetentionPoint } from '@/domain/stats/progressMetrics'
import { RetentionChart } from './RetentionChart'
import { buildRetentionGeometry } from './retentionChartPath'

function series(values: (number | null)[]): RetentionPoint[] {
  return values.map((retention, i) => ({ bucketStart: i, bucketEnd: i + 1, retention }))
}

const points: RetentionPoint[] = series([0.5, 0.75, null, 0.6, 0.8])

function renderChart(chartPoints: RetentionPoint[]) {
  return render(
    <RetentionChart
      points={chartPoints}
      deckOptions={[]}
      selectedDeckId="all"
      onDeckChange={() => {}}
    />,
  )
}

afterEach(() => cleanup())

describe('RetentionChart gaps', () => {
  it('creates separate paths around a missing bucket', () => {
    const { segments } = buildRetentionGeometry(points)
    expect(segments).toHaveLength(2)
    expect(segments.every((path) => path.split('M').length === 2)).toBe(true)
    expect(segments.every((path) => path.includes('L'))).toBe(true)
  })

  it('renders one SVG path per consecutive data segment', () => {
    const { container } = renderChart(points)
    expect(container.querySelectorAll('[data-retention-segment="true"]')).toHaveLength(2)
  })

  // The QA case: an early lone observation, a gap, then a later run. The lone
  // observation used to disappear entirely.
  it('draws an isolated bucket as a point beside a later segment', () => {
    const { container } = renderChart(series([0.75, null, null, 0.6, 0.8]))
    expect(container.querySelectorAll('[data-retention-segment="true"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-retention-point="true"]')).toHaveLength(1)
  })

  it('draws every isolated bucket when no two observations are adjacent', () => {
    const { container } = renderChart(series([0.7, null, 0.8, null, null, 0.9]))
    expect(container.querySelectorAll('[data-retention-segment="true"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-retention-point="true"]')).toHaveLength(3)
  })

  // Unchanged behavior: one observation is not a trend, so the chart stays
  // behind its existing empty state rather than drawing a lone dot.
  it('keeps the not-enough-history copy for a single observation', () => {
    renderChart(series([null, 0.65, null]))
    expect(screen.getByText('Not enough review history yet to chart a trend.')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Retention rate over time' })).toBeNull()
  })
})
