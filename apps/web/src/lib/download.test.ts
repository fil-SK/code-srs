// @vitest-environment happy-dom
//
// Protects the browser-compatibility contract of the app's single download
// path (Settings -> Import / Export -> Export JSON). The pre-2026-08-22
// version never put the anchor in the document and revoked the object URL in
// the same task; both are Chromium-tolerated shortcuts that have historically
// no-opped elsewhere. Fake timers so nothing here depends on real time.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from './download'

let created: { url: string; blob: Blob }[]
let revoked: string[]
/** Whether the anchor was in the document at the moment click() fired. */
let connectedAtClick: boolean | null
let clickedHref: string | null

beforeEach(() => {
  vi.useFakeTimers()
  created = []
  revoked = []
  connectedAtClick = null
  clickedHref = null

  let n = 0
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: Blob) => {
      const url = `blob:itera/${++n}`
      created.push({ url, blob })
      return url
    },
    revokeObjectURL: (url: string) => revoked.push(url),
  })

  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    connectedAtClick = this.isConnected
    clickedHref = this.getAttribute('href')
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('downloadText', () => {
  it('creates one object URL from a blob carrying the text and mime type', async () => {
    downloadText('itera-backup-2026-08-22.json', '{"app":"code-srs"}')

    expect(created).toHaveLength(1)
    expect(created[0].blob.type).toBe('application/json')
    await expect(created[0].blob.text()).resolves.toBe('{"app":"code-srs"}')
  })

  it('honors an explicit mime type', () => {
    downloadText('notes.txt', 'hello', 'text/plain')
    expect(created[0].blob.type).toBe('text/plain')
  })

  it('gives the anchor the filename and the object URL', () => {
    downloadText('itera-backup-2026-08-22.json', '{}')
    expect(clickedHref).toBe(created[0].url)
  })

  it('has the anchor in the document when the click fires', () => {
    downloadText('itera-backup-2026-08-22.json', '{}')
    // The regression: an anchor that was never appended does not reliably
    // dispatch the download outside Chromium.
    expect(connectedAtClick).toBe(true)
  })

  it('leaves no anchor behind in the document', () => {
    downloadText('itera-backup-2026-08-22.json', '{}')
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  it('does not revoke the object URL in the same task as the click', () => {
    downloadText('itera-backup-2026-08-22.json', '{}')
    expect(revoked).toEqual([])
  })

  it('revokes the object URL once the pending task runs', () => {
    downloadText('itera-backup-2026-08-22.json', '{}')
    vi.runAllTimers()
    expect(revoked).toEqual([created[0].url])
  })

  it('revokes every URL it created across repeated exports', () => {
    downloadText('a.json', '{}')
    downloadText('b.json', '{}')
    vi.runAllTimers()
    expect(revoked).toEqual(created.map((c) => c.url))
  })
})
