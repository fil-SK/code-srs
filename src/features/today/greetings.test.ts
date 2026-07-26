import { describe, expect, it } from 'vitest'
import { getTimeBucket, pickDashboardMessage } from './greetings'

describe('getTimeBucket', () => {
  it('buckets late night across the midnight wrap', () => {
    expect(getTimeBucket(23)).toBe('lateNight')
    expect(getTimeBucket(0)).toBe('lateNight')
    expect(getTimeBucket(4)).toBe('lateNight')
  })

  it('buckets morning, day, and evening', () => {
    expect(getTimeBucket(5)).toBe('morning')
    expect(getTimeBucket(11)).toBe('morning')
    expect(getTimeBucket(12)).toBe('day')
    expect(getTimeBucket(17)).toBe('day')
    expect(getTimeBucket(18)).toBe('evening')
    expect(getTimeBucket(22)).toBe('evening')
  })
})

describe('pickDashboardMessage', () => {
  it('returns a non-empty mainText and subtext for every hour of the day', () => {
    for (let hour = 0; hour < 24; hour++) {
      const now = new Date(2026, 0, 1, hour)
      const message = pickDashboardMessage(now)
      expect(message.mainText.length).toBeGreaterThan(0)
      expect(message.subtext.length).toBeGreaterThan(0)
    }
  })
})
