import { describe, it, expect } from 'vitest'
import { buildRange, previousPeriod, formatRangeLabel, formatEventDate } from './dateRange'

// Fixed "now": Sunday 2025-06-01 12:00 local time.
const NOW = new Date(2025, 5, 1, 12, 0, 0).getTime()
const DAY = 86_400_000

describe('buildRange', () => {
  it('spans exactly `days` calendar days ending today, `to` exclusive', () => {
    const range = buildRange('30d', NOW)
    expect(range.days).toBe(30)
    expect(range.to - range.from).toBe(30 * DAY)
    // `to` is the start of the day after today.
    const tomorrow = new Date(2025, 5, 2, 0, 0, 0).getTime()
    expect(range.to).toBe(tomorrow)
  })

  it('defaults to 30 days for an unrecognized preset', () => {
    // @ts-expect-error deliberately invalid preset to test the fallback
    const range = buildRange('bogus', NOW)
    expect(range.days).toBe(30)
  })
})

describe('previousPeriod', () => {
  it('returns the immediately preceding window of equal length', () => {
    const range = buildRange('7d', NOW)
    const prev = previousPeriod(range)
    expect(prev.to).toBe(range.from)
    expect(prev.to - prev.from).toBe(range.to - range.from)
  })
})

describe('formatRangeLabel', () => {
  it('omits the year on the start date when both ends share a year', () => {
    const range = buildRange('30d', NOW) // May 3 - Jun 1, 2025 (28d span example may vary)
    const label = formatRangeLabel(range)
    expect(label).toMatch(/^[A-Za-z]{3} \d{1,2} – [A-Za-z]{3} \d{1,2}, 2025$/)
  })

  it('shows the year on the start date when the range crosses a year boundary', () => {
    const range = buildRange('1y', NOW)
    const label = formatRangeLabel(range)
    expect(label).toMatch(/^[A-Za-z]{3} \d{1,2}, \d{4} – [A-Za-z]{3} \d{1,2}, \d{4}$/)
  })
})

describe('formatEventDate', () => {
  it('labels today and yesterday specially', () => {
    expect(formatEventDate(NOW, NOW)).toBe('Today')
    expect(formatEventDate(NOW - DAY, NOW)).toBe('Yesterday')
  })

  it('falls back to an absolute date further back', () => {
    expect(formatEventDate(NOW - 10 * DAY, NOW)).toBe('May 22')
  })
})
