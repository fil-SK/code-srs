// Wrap a dynamic import so that a stale-chunk failure — common right after a
// deploy, when the previous build's hashed asset files are gone from the server
// — reloads the page to fetch the new build instead of crashing. Guarded so it
// reloads at most once per short window, avoiding reload loops.
export function importWithReload<T>(factory: () => Promise<T>): Promise<T> {
  return factory().catch((error) => {
    const KEY = 'chunk-reload-at'
    let last = 0
    try {
      last = Number(sessionStorage.getItem(KEY) || 0)
    } catch {
      // sessionStorage unavailable — fall through and rethrow
    }
    if (Date.now() - last > 10_000) {
      try {
        sessionStorage.setItem(KEY, String(Date.now()))
      } catch {
        // ignore
      }
      window.location.reload()
      return new Promise<T>(() => {}) // hang while the reload happens
    }
    throw error
  })
}
