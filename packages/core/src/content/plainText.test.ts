import { describe, expect, it } from 'vitest'
import { stripInlineMarkers } from './plainText'
import { MUST_SURVIVE_LITERALLY } from '../test/attackPayloads'

// The accessible-name flattening the Matching board announces with. It moved
// here verbatim from that component, so these lock the exact behavior rather
// than an idealized one - see the module comment on why it is marker-blind.

describe('stripInlineMarkers', () => {
  it('removes the markers an announcer should not spell out', () => {
    expect(stripInlineMarkers('**bold** and *italic* and `code`')).toBe('bold and italic and code')
  })

  it('leaves ordinary prose untouched', () => {
    expect(stripInlineMarkers('A hash map is amortized O(1).')).toBe('A hash map is amortized O(1).')
  })

  it('is marker-blind: it removes unmatched markers too', () => {
    expect(stripInlineMarkers('a * b')).toBe('a  b')
    expect(stripInlineMarkers('unclosed `code')).toBe('unclosed code')
  })

  it('never touches underscores, matching the parser', () => {
    expect(stripInlineMarkers('snake_case_name')).toBe('snake_case_name')
    expect(stripInlineMarkers('__dunder__')).toBe('__dunder__')
  })

  it('keeps angle brackets and operators, which are content rather than markup', () => {
    for (const source of MUST_SURVIVE_LITERALLY) {
      expect(stripInlineMarkers(source)).toBe(source.replace(/[`*]/g, ''))
    }
    expect(stripInlineMarkers('Vec<T>')).toBe('Vec<T>')
    expect(stripInlineMarkers('a < b && c > d')).toBe('a < b && c > d')
  })

  it('handles the empty string', () => {
    expect(stripInlineMarkers('')).toBe('')
  })
})
