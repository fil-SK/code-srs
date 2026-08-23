// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { KpiDelta } from './KpiTile'

afterEach(() => cleanup())

describe('KpiDelta', () => {
  it('formats retention changes as percentage points', () => {
    render(
      <KpiDelta
        delta={5}
        comparisonLabel="previous period"
        unit="percentagePoints"
      />,
    )
    expect(screen.getByText(/5 pp vs previous period/)).toBeTruthy()
    expect(screen.queryByText(/5%/)).toBeNull()
  })

  it('keeps count changes as percentages, including a flat comparison', () => {
    const { rerender } = render(
      <KpiDelta delta={25} comparisonLabel="previous period" />,
    )
    expect(screen.getByText(/25% vs previous period/)).toBeTruthy()
    rerender(<KpiDelta delta={0} comparisonLabel="previous period" />)
    expect(screen.getByText(/0% vs previous period/)).toBeTruthy()
  })
})
