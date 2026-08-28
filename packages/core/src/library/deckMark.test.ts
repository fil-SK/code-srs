import { describe, expect, it } from 'vitest'
import { markLabelFor } from './deckMark'

describe('markLabelFor', () => {
  it('takes the initials of the first two words', () => {
    expect(markLabelFor('Modern Memory')).toBe('MM')
    expect(markLabelFor('Systems and Distributed Systems')).toBe('SA')
  })

  it('skips separator words so an ampersand never becomes a monogram letter', () => {
    expect(markLabelFor('Algorithms & Problem Solving')).toBe('AP')
    expect(markLabelFor('Compilers & MLIR')).toBe('CM')
    expect(markLabelFor('Systems & Distributed Systems')).toBe('SD')
    expect(markLabelFor('Languages & Compilers')).toBe('LC')
    expect(markLabelFor('Modern C++ & Memory')).toBe('MC')
  })

  it('keeps a short single-word name whole at the header size', () => {
    expect(markLabelFor('C++', 3)).toBe('C++')
    expect(markLabelFor('SQL', 3)).toBe('SQL')
    expect(markLabelFor('C++')).toBe('C+')
  })

  it('uses the first real word when everything else is punctuation', () => {
    expect(markLabelFor('Rust —')).toBe('RU')
    expect(markLabelFor('& Compilers')).toBe('CO')
  })

  it('falls back rather than inventing a letter', () => {
    expect(markLabelFor('')).toBe('?')
    expect(markLabelFor('   ')).toBe('?')
    expect(markLabelFor('&&')).toBe('&&')
  })

  it('handles non-Latin names', () => {
    expect(markLabelFor('Разбор Кода')).toBe('РК')
  })
})
