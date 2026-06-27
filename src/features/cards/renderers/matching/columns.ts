import type { MatchingContent, MatchingPair } from '@/types'
import { thirdKey } from './keys'

// The two answer columns of a matching card.
export type Col = 'right' | 'third'

// Response key for a column's choice on a given row.
export const colKey = (col: Col, pairId: string) =>
  col === 'right' ? pairId : thirdKey(pairId)

// The row's correct text for a column.
export const colValue = (col: Col, pair: MatchingPair) =>
  col === 'right' ? pair.right : (pair.third ?? '')

// A column is in "fixed dropdown" mode when it has a defined option list.
export const isFixed = (content: MatchingContent, col: Col) =>
  Array.isArray(content.options?.[col])

// The cleaned (trimmed, de-duplicated, non-empty) option values for a fixed column.
export const fixedValues = (content: MatchingContent, col: Col): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of content.options?.[col] ?? []) {
    const t = v.trim()
    if (t && !seen.has(t)) {
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

// The id/value a correct choice must equal: the row's value in fixed mode
// (so rows can share answers), or the pair id in unique-matching mode.
export const correctTarget = (
  content: MatchingContent,
  col: Col,
  pair: MatchingPair,
) => (isFixed(content, col) ? colValue(col, pair) : pair.id)
