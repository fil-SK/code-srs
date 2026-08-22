import { describe, expect, it } from 'vitest'
import { matchesAcceptedAnswer } from './writeCode'

const strict = {
  trimOuterWhitespace: true,
  normalizeLineEndings: true,
  ignoreTrailingWhitespace: true,
  caseSensitive: true,
}

describe('matchesAcceptedAnswer', () => {
  it('matches an exact accepted answer', () => {
    expect(matchesAcceptedAnswer('lst[::-1]', ['lst[::-1]'], strict)).toBe(true)
  })

  it('matches any of several accepted answers', () => {
    expect(matchesAcceptedAnswer('b', ['a', 'b', 'c'], strict)).toBe(true)
    expect(matchesAcceptedAnswer('z', ['a', 'b', 'c'], strict)).toBe(false)
  })

  it('trimOuterWhitespace ignores only leading/trailing whitespace of the whole answer', () => {
    expect(matchesAcceptedAnswer('  return 1;  ', ['return 1;'], strict)).toBe(true)
    expect(matchesAcceptedAnswer('  return 1;  ', ['return 1;'], {
      ...strict,
      trimOuterWhitespace: false,
    })).toBe(false)
  })

  it('normalizeLineEndings treats CRLF/CR the same as LF', () => {
    expect(
      matchesAcceptedAnswer('a\r\nb', ['a\nb'], strict),
    ).toBe(true)
    expect(
      matchesAcceptedAnswer('a\r\nb', ['a\nb'], { ...strict, normalizeLineEndings: false }),
    ).toBe(false)
  })

  it('ignoreTrailingWhitespace strips only trailing whitespace per line, not internal indentation', () => {
    expect(
      matchesAcceptedAnswer('a  \nb\t', ['a\nb'], strict),
    ).toBe(true)
    expect(
      matchesAcceptedAnswer('a  \nb\t', ['a\nb'], { ...strict, ignoreTrailingWhitespace: false }),
    ).toBe(false)
    // Leading (indentation) whitespace is never touched by this flag —
    // isolate it from trimOuterWhitespace, which would otherwise also trim it.
    expect(
      matchesAcceptedAnswer('  a', ['a'], { ...strict, trimOuterWhitespace: false }),
    ).toBe(false)
  })

  it('caseSensitive false matches regardless of case', () => {
    expect(
      matchesAcceptedAnswer('Return', ['return'], { ...strict, caseSensitive: false }),
    ).toBe(true)
    expect(matchesAcceptedAnswer('Return', ['return'], strict)).toBe(false)
  })
})
