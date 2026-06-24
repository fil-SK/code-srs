export interface NormalizeOptions {
  ignoreWhitespace: boolean
  caseSensitive: boolean
}

// Normalize a code answer for comparison. ignoreWhitespace collapses all
// whitespace (so formatting differences don't matter); otherwise just trims.
export function normalizeCode(input: string, opts: NormalizeOptions): string {
  let s = opts.caseSensitive ? input : input.toLowerCase()
  s = opts.ignoreWhitespace ? s.replace(/\s+/g, '') : s.trim()
  return s
}

export function matchesAnySolution(
  answer: string,
  solutions: string[],
  opts: NormalizeOptions,
): boolean {
  const normalized = normalizeCode(answer, opts)
  return solutions.some((sol) => normalizeCode(sol, opts) === normalized)
}
