// Trigger a client-side file download of the given text.
//
// The anchor is appended to the document before the click and the object URL is
// revoked on a later task rather than synchronously. Both matter: an anchor
// that is not in the document has historically not dispatched the download in
// Firefox, and revoking in the same task can beat the browser to reading the
// blob. Chromium tolerates the shorter version, which is exactly why the
// shorter version survived here until the 2026-08-22 audit - and Export is the
// app's only backup path, so a silent no-op is the worst failure it could have.
export function downloadText(
  filename: string,
  text: string,
  mime = 'application/json',
): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  a.remove()
  // Next task, not next microtask: the click's default action is queued, not
  // synchronous. Deferred rather than left alive, so nothing holds the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
