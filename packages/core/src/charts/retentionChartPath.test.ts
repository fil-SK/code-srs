import { describe, expect, it } from 'vitest'
import type { RetentionPoint } from '../domain/stats/progressMetrics'
import { buildRetentionGeometry, xFor } from './retentionChartPath'

// `retention: null` means "no mature attempts fell in this bucket". A run of
// adjacent observations is a line; a lone observation is a point; neither may
// ever reach across a null.
function series(values: (number | null)[]): RetentionPoint[] {
  return values.map((retention, i) => ({ bucketStart: i, bucketEnd: i + 1, retention }))
}

/** Every x coordinate a `d` string mentions, in order. */
function xsOf(path: string): number[] {
  return [...path.matchAll(/[ML] (\d+\.\d) /g)].map((m) => Number(m[1]))
}

describe('buildRetentionGeometry', () => {
  it('draws one segment through a contiguous series', () => {
    const { segments, isolated } = buildRetentionGeometry(series([0.5, 0.75, 0.6, 0.8]))
    expect(segments).toHaveLength(1)
    expect(isolated).toHaveLength(0)
    expect(segments[0].split('M')).toHaveLength(2)
    expect(xsOf(segments[0])).toHaveLength(4)
  })

  it('splits two multi-point runs separated by nulls, without bridging the gap', () => {
    const points = series([0.5, 0.75, null, null, 0.6, 0.8])
    const { segments, isolated } = buildRetentionGeometry(points)
    expect(segments).toHaveLength(2)
    expect(isolated).toHaveLength(0)
    // Each segment stops at its own run: no coordinate belongs to the gap.
    expect(xsOf(segments[0])).toEqual([0, 1].map((i) => Number(xFor(i, 6).toFixed(1))))
    expect(xsOf(segments[1])).toEqual([4, 5].map((i) => Number(xFor(i, 6).toFixed(1))))
  })

  it('keeps a singleton run that comes before a gap', () => {
    const { segments, isolated } = buildRetentionGeometry(series([0.75, null, null, 0.6, 0.8]))
    expect(segments).toHaveLength(1)
    expect(isolated.map((m) => m.index)).toEqual([0])
    expect(isolated[0].x).toBeCloseTo(xFor(0, 5), 5)
  })

  it('keeps a singleton run that comes after a gap', () => {
    const { segments, isolated } = buildRetentionGeometry(series([0.5, 0.75, null, null, 0.9]))
    expect(segments).toHaveLength(1)
    expect(isolated.map((m) => m.index)).toEqual([4])
    expect(isolated[0].x).toBeCloseTo(xFor(4, 5), 5)
  })

  // The reported bug: every observation in this series was a singleton, so the
  // paths-only build produced nothing at all.
  it('keeps every singleton when several are separated by nulls', () => {
    const { segments, isolated } = buildRetentionGeometry(
      series([0.7, null, 0.8, null, null, 0.9, null]),
    )
    expect(segments).toHaveLength(0)
    expect(isolated.map((m) => m.index)).toEqual([0, 2, 5])
  })

  it('produces nothing when there are no observations', () => {
    expect(buildRetentionGeometry(series([null, null, null]))).toEqual({
      segments: [],
      isolated: [],
    })
  })

  it('reports a single observation as one isolated point', () => {
    const { segments, isolated } = buildRetentionGeometry(series([null, 0.65, null]))
    expect(segments).toHaveLength(0)
    expect(isolated.map((m) => m.index)).toEqual([1])
  })

  it('handles an empty series', () => {
    expect(buildRetentionGeometry([])).toEqual({ segments: [], isolated: [] })
  })
})
