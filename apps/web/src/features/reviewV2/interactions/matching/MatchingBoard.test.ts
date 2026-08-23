import { describe, expect, it } from 'vitest'
import { placeMatchingBadges } from './matchingBadgeGeometry'

function curve(y1: number, y2: number) {
  return {
    x1: 0,
    y1,
    controlX1: 40,
    controlY1: y1,
    controlX2: 60,
    controlY2: y2,
    x2: 100,
    y2,
  }
}

describe('placeMatchingBadges', () => {
  it('puts an isolated badge at the exact midpoint of its connection', () => {
    expect(placeMatchingBadges([curve(0, 136)])[0]).toEqual({ x: 50, y: 68 })
  })

  it('keeps straight-row badges centered', () => {
    expect(placeMatchingBadges([curve(0, 0), curve(68, 68)])).toEqual([
      { x: 50, y: 0 },
      { x: 50, y: 68 },
    ])
  })

  it('separates badges whose crossing connections share a midpoint', () => {
    const [first, second] = placeMatchingBadges([curve(0, 68), curve(68, 0)])

    expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThanOrEqual(28)
    expect(first.x).toBeGreaterThanOrEqual(30)
    expect(first.x).toBeLessThanOrEqual(70)
    expect(second.x).toBe(first.x)
  })
})
