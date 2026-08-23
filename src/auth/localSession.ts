import { parseLocalSession, type LocalSession, type LocalSessionStore } from '@itera/core'

// The browser's implementation of @itera/core's LocalSessionStore, and the one
// and only file in this app that may touch auth storage. Nothing else reads or
// writes a session key, so "am I signed in?" has exactly one answer and one
// place to change when a real local account system arrives.
//
// What a local/demo session *is* now lives in core (its shape, how a stored
// record is read back, the demo identity, the mode rule that decides whether it
// counts). What is left here is genuinely browser-specific: two stores, one key,
// and the Remember me choice between them.
//
// This is a development/demo shell, not authentication: no password is stored,
// verified, or transmitted. It exists so the product has a real session
// boundary (sign in -> app -> sign out -> login) while the app remains
// local-first with no backend.

export { createLocalSession, DEMO_EMAIL } from '@itera/core'
export type { LocalSession, LocalSessionKind } from '@itera/core'

// Platform-owned on purpose: core never learns the key, and a native app is free
// to name its own.
const KEY = 'itera.session'

// Storage access throws outright in some privacy modes, so every entry point
// is guarded rather than assumed to work.
function safeRead(store: Storage): string | null {
  try {
    return store.getItem(KEY)
  } catch {
    return null
  }
}

/** localStorage (Remember me) wins over sessionStorage when both somehow exist. */
export function readLocalSession(): LocalSession | null {
  if (typeof window === 'undefined') return null
  return (
    parseLocalSession(safeRead(window.localStorage)) ??
    parseLocalSession(safeRead(window.sessionStorage))
  )
}

/** `remember: false` keeps the session to the tab, so closing it signs out. */
export function writeLocalSession(
  session: LocalSession,
  { remember }: { remember: boolean },
): void {
  if (typeof window === 'undefined') return
  const raw = JSON.stringify(session)
  try {
    // Always clear the other store first, or a stale remembered session would
    // shadow the one just written (readLocalSession prefers localStorage).
    window.localStorage.removeItem(KEY)
    window.sessionStorage.removeItem(KEY)
    ;(remember ? window.localStorage : window.sessionStorage).setItem(KEY, raw)
  } catch {
    // Nothing to do: the session simply will not survive a reload.
  }
}

export function clearLocalSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Ignore: already unreachable storage means nothing was persisted either.
  }
}

/** The same three operations, as the object core's auth layer is handed. */
export const browserSessionStore: LocalSessionStore = {
  read: readLocalSession,
  write: writeLocalSession,
  clear: clearLocalSession,
}
