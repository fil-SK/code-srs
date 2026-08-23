import { useEffect } from 'react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// A dynamic-import failure (usually a stale chunk right after a deploy) surfaces
// here. Detect it and reload once to pick up the new build.
function isChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|module script failed|ChunkLoadError|Failed to fetch/i.test(
    msg,
  )
}

function reloadOnce() {
  const KEY = 'chunk-reload-at'
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY) || 0)
  } catch {
    // ignore
  }
  if (Date.now() - last > 10_000) {
    try {
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      // ignore
    }
    window.location.reload()
  }
}

export function RouteError() {
  const error = useRouteError()

  useEffect(() => {
    if (isChunkError(error)) reloadOnce()
  }, [error])

  // An unmatched path is not a crash, and "reloading usually fixes it" is false
  // advice for one — reloading a deleted route just lands here again. Several
  // routes were removed with the v1 legacy surface, so a bookmark to one is an
  // expected way to arrive here.
  const notFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <IteraSurface className="grid min-h-screen place-items-center px-4">
      <div className="mx-auto max-w-md rounded-itera-card border border-itera-border bg-itera-surface p-8 text-center">
        <div className="text-lg font-semibold text-itera-ink-brand">
          {notFound ? 'Page not found' : 'Something went wrong'}
        </div>
        <p className="mt-2 text-sm text-itera-muted">
          {notFound
            ? 'This page does not exist. It may have been removed, or the link may be out of date.'
            : 'The app may have just updated. Reloading usually fixes it.'}
        </p>
        {notFound ? (
          <Link to="/" className="mt-4 inline-block">
            <Button variant="primary">Back to Today</Button>
          </Link>
        ) : (
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        )}
      </div>
    </IteraSurface>
  )
}
