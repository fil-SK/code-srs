import { describe, expect, it } from 'vitest'
import {
  ALLOWED_IMAGE_MIME,
  IMAGE_FILE_ACCEPT,
  isAllowedImageFileType,
  isSafeImageSource,
} from './imageSource'
import { REJECTED_IMAGE_SOURCES, VALID_PNG_DATA_URL } from '../test/attackPayloads'

// WalkthroughInteraction.image is the only card field that becomes a URL the
// app loads, and a card can arrive from a backup file somebody else wrote.
// These lock the allowlist that keeps opening a flashcard from turning into a
// network callback.

describe('isSafeImageSource', () => {
  it('accepts a data URL the authoring flow itself produces', () => {
    expect(isSafeImageSource(VALID_PNG_DATA_URL)).toBe(true)
  })

  it('accepts every allowed raster media type', () => {
    for (const mime of ALLOWED_IMAGE_MIME) {
      expect(isSafeImageSource(`data:${mime};base64,AAAA`)).toBe(true)
    }
  })

  it('accepts base64 padding', () => {
    expect(isSafeImageSource('data:image/png;base64,AAA=')).toBe(true)
    expect(isSafeImageSource('data:image/png;base64,AA==')).toBe(true)
  })

  it('rejects every hostile or remote source', () => {
    for (const source of REJECTED_IMAGE_SOURCES) {
      expect(isSafeImageSource(source), source).toBe(false)
    }
  })

  it('rejects remote schemes specifically, including protocol-relative', () => {
    expect(isSafeImageSource('https://attacker.example/beacon.gif')).toBe(false)
    expect(isSafeImageSource('http://attacker.example/beacon.gif')).toBe(false)
    expect(isSafeImageSource('//attacker.example/beacon.gif')).toBe(false)
    expect(isSafeImageSource('HTTPS://attacker.example/beacon.gif')).toBe(false)
  })

  it('rejects javascript: and vbscript: in any casing or with leading space', () => {
    for (const source of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      ' javascript:alert(1)',
      '\tjavascript:alert(1)',
      '\njavascript:alert(1)',
      'vbscript:msgbox(1)',
    ]) {
      expect(isSafeImageSource(source), source).toBe(false)
    }
  })

  it('rejects a data URL whose media type is not an allowed image', () => {
    for (const mime of ['text/html', 'image/svg+xml', 'application/javascript', 'image/bmp']) {
      expect(isSafeImageSource(`data:${mime};base64,AAAA`), mime).toBe(false)
    }
  })

  it('rejects any value carrying whitespace, so a stripped URL cannot become a different one', () => {
    // A browser removes ASCII whitespace from a URL attribute before parsing
    // it, so `data:image/sv\ng+xml` would become svg+xml after parsing. The
    // predicate refuses the whole class rather than normalizing it.
    expect(isSafeImageSource('data:image/sv g+xml;base64,AAAA')).toBe(false)
    expect(isSafeImageSource('data:image/sv\ng+xml;base64,AAAA')).toBe(false)
    expect(isSafeImageSource('data:image/png ;base64,AAAA')).toBe(false)
    expect(isSafeImageSource('data:image/png;base64,AA\tAA')).toBe(false)
  })

  it('rejects a non-base64 payload and an empty payload', () => {
    expect(isSafeImageSource('data:image/png,raw')).toBe(false)
    expect(isSafeImageSource('data:image/png;base64,')).toBe(false)
    expect(isSafeImageSource('data:image/png;base64,AA*AA')).toBe(false)
    expect(isSafeImageSource('data:image/png;base64,"onload="alert(1)')).toBe(false)
  })

  it('is total: any non-string, including undefined, is simply not safe', () => {
    for (const value of [undefined, null, 0, 1, true, {}, [], () => {}]) {
      expect(isSafeImageSource(value)).toBe(false)
    }
  })

  it('accepts an uppercase media type, since an allowlist cannot be case-tricked', () => {
    expect(isSafeImageSource('DATA:IMAGE/PNG;BASE64,AAAA')).toBe(true)
  })
})

describe('the authoring filter uses the same list', () => {
  it('accepts exactly the allowed media types', () => {
    for (const mime of ALLOWED_IMAGE_MIME) expect(isAllowedImageFileType(mime)).toBe(true)
    expect(isAllowedImageFileType('IMAGE/PNG')).toBe(true)
  })

  it('rejects SVG and every other image type, so authoring cannot mint a rejected value', () => {
    for (const mime of ['image/svg+xml', 'image/bmp', 'image/tiff', 'text/html', '']) {
      expect(isAllowedImageFileType(mime), mime).toBe(false)
    }
  })

  it('derives the file picker accept attribute from the same list', () => {
    expect(IMAGE_FILE_ACCEPT.split(',')).toEqual([...ALLOWED_IMAGE_MIME])
    expect(IMAGE_FILE_ACCEPT).not.toContain('*')
  })

  it('excludes SVG deliberately', () => {
    // Stated as a test so removing it is a decision, not a diff.
    expect(ALLOWED_IMAGE_MIME).not.toContain('image/svg+xml')
  })
})
