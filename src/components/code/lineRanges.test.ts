import { describe, expect, it } from 'vitest'
import { parseLineRanges } from './lineRanges'

describe('parseLineRanges', () => {
  it('parses single lines and ranges', () => {
    expect(parseLineRanges('26-34, 40, 42-45')).toEqual([
      26, 27, 28, 29, 30, 31, 32, 33, 34, 40, 42, 43, 44, 45,
    ])
  })

  it('dedupes and sorts overlapping or unordered input', () => {
    expect(parseLineRanges('5, 3-4, 4, 34-32')).toEqual([3, 4, 5, 32, 33, 34])
  })

  it('ignores blanks and invalid tokens', () => {
    expect(parseLineRanges('  , abc, 7, 8-')).toEqual([7])
    expect(parseLineRanges('')).toEqual([])
  })

  it('skips absurdly large ranges', () => {
    expect(parseLineRanges('1-999999')).toEqual([])
  })
})
