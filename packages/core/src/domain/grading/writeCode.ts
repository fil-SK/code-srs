import type { WriteCodeInteraction } from '../../types/card'

type Comparison = WriteCodeInteraction['comparison']

// Deliberately not the same normalization as the deleted v1 grader (which
// collapsed *all* whitespace under `ignoreWhitespace`): the v2 spec wants
// line-ending normalization, trimming
// only the outer edges, and ignoring only *trailing* per-line whitespace —
// collapsing all internal whitespace would be too lenient for code and could
// mask real indentation differences. A separate function, not an overload.
function normalizeForComparison(input: string, opts: Comparison): string {
  let s = input
  if (opts.normalizeLineEndings) s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (opts.ignoreTrailingWhitespace) {
    s = s
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, ''))
      .join('\n')
  }
  if (opts.trimOuterWhitespace) s = s.trim()
  if (!opts.caseSensitive) s = s.toLowerCase()
  return s
}

export function matchesAcceptedAnswer(
  answer: string,
  acceptedAnswers: string[],
  comparison: Comparison,
): boolean {
  const normalized = normalizeForComparison(answer, comparison)
  return acceptedAnswers.some(
    (accepted) => normalizeForComparison(accepted, comparison) === normalized,
  )
}
