// Parse a human-friendly line spec like "26-34, 40, 42-45" into a sorted, deduped
// list of 1-based line numbers. Invalid tokens are ignored, and absurdly large
// ranges are skipped so a typo like "1-999999" can't blow up. Out-of-range lines
// are left in; the code viewer clamps them against the actual document.
export function parseLineRanges(spec: string): number[] {
  const MAX_SPAN = 5000
  const out = new Set<number>()
  for (const raw of spec.split(',')) {
    const token = raw.trim()
    if (!token) continue
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    const lo = Math.max(1, Math.min(a, b))
    const hi = Math.max(a, b)
    if (hi - lo > MAX_SPAN) continue
    for (let n = lo; n <= hi; n++) out.add(n)
  }
  return [...out].sort((x, y) => x - y)
}
