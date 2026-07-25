// Expands the richer multi-range `focus` shape (an array of {startLine,
// endLine} ranges - see cardV2.ts's WalkthroughStep) into the flat line-number
// list LazyCodeView/CodeView already accepts via `highlightLines`. Not the
// same job as lineRanges.ts's parseLineRanges (that parses a human-typed
// spec string like "26-34, 40"); this adapts already-structured ranges to
// the same flat consumer, reusing the existing highlighting mechanism rather
// than adding a second one.
export function focusToHighlightLines(
  focus: Array<{ startLine: number; endLine: number }> | undefined,
): number[] | undefined {
  if (!focus || focus.length === 0) return undefined
  const lines = new Set<number>()
  for (const { startLine, endLine } of focus) {
    const lo = Math.min(startLine, endLine)
    const hi = Math.max(startLine, endLine)
    for (let n = lo; n <= hi; n++) lines.add(n)
  }
  return [...lines].sort((a, b) => a - b)
}
