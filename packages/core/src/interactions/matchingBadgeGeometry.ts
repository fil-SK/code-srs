export interface CubicEdgeGeometry {
  x1: number
  y1: number
  controlX1: number
  controlY1: number
  controlX2: number
  controlY2: number
  x2: number
  y2: number
}

const BADGE_CLEARANCE = 28 // 24px badge plus 4px breathing room

// A connection badge belongs at the visual midpoint, matching the locked
// mockup. Crossing connections can have the exact same midpoint, so a
// colliding group shares the nearest alternate position along its own curves.
// Keeping one t for the whole group preserves symmetry and keeps every badge
// on its connector instead of pushing it into arbitrary screen-space offsets.
const BADGE_T_CANDIDATES = [
  0.5,
  0.46,
  0.54,
  0.42,
  0.58,
  0.38,
  0.62,
  0.34,
  0.66,
  0.3,
  0.7,
  0.26,
  0.74,
  0.22,
  0.78,
]

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
}

function pointOnEdge(edge: CubicEdgeGeometry, t: number): { x: number; y: number } {
  return {
    x: cubicAt(t, edge.x1, edge.controlX1, edge.controlX2, edge.x2),
    y: cubicAt(t, edge.y1, edge.controlY1, edge.controlY2, edge.y2),
  }
}

function badgesOverlap(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < BADGE_CLEARANCE
}

// Browser layout supplies these curves in MatchingBoard. Keeping collision
// placement pure makes the crossing case testable without pretending
// happy-dom has real layout.
export function placeMatchingBadges(
  curves: CubicEdgeGeometry[],
): Array<{ x: number; y: number }> {
  const midpoints = curves.map((curve) => pointOnEdge(curve, 0.5))
  const remaining = new Set(curves.map((_, index) => index))
  const groups: number[][] = []

  while (remaining.size > 0) {
    const start = remaining.values().next().value
    if (start === undefined) break
    remaining.delete(start)
    const group = [start]

    // Transitive grouping matters when A touches B and B touches C even if A
    // and C are just far enough apart on their own.
    for (let cursor = 0; cursor < group.length; cursor += 1) {
      const current = group[cursor]
      for (const candidate of Array.from(remaining)) {
        if (badgesOverlap(midpoints[current], midpoints[candidate])) {
          remaining.delete(candidate)
          group.push(candidate)
        }
      }
    }
    groups.push(group)
  }

  const placed: Array<{ x: number; y: number } | undefined> = curves.map(() => undefined)

  for (const group of groups) {
    const t = BADGE_T_CANDIDATES.find((candidateT) => {
      const candidates = group.map((index) => pointOnEdge(curves[index], candidateT))
      const earlier = placed.filter((point): point is { x: number; y: number } => point != null)
      return candidates.every(
        (candidate, index) =>
          candidates.slice(index + 1).every((other) => !badgesOverlap(candidate, other)) &&
          earlier.every((other) => !badgesOverlap(candidate, other)),
      )
    }) ?? BADGE_T_CANDIDATES[BADGE_T_CANDIDATES.length - 1]

    for (const index of group) placed[index] = pointOnEdge(curves[index], t)
  }

  return placed.map((point) => point ?? { x: 0, y: 0 })
}
