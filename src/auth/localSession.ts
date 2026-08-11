import { newId } from '@/lib/id'

// The one and only storage seam for the local (non-Supabase) session. Nothing
// else in the app reads or writes an auth key directly, so "am I signed in?"
// has exactly one answer and one place to change when a real local account
// system arrives.
//
// This is a development/demo shell, not authentication: no password is stored,
// verified, or transmitted. It exists so the product has a real session
// boundary (sign in -> app -> sign out -> login) while the app remains
// local-first with no backend.

export type LocalSessionKind = 'local' | 'demo'

export interface LocalSession {
  id: string
  email: string
  kind: LocalSessionKind
  createdAt: string
}

const KEY = 'itera.session'

/** The demo workspace's fixed identity. `.local` is reserved, so it can never
 *  collide with a real address someone signs in with. */
export const DEMO_EMAIL = 'demo@itera.local'

// Storage access throws outright in some privacy modes, so every entry point
// is guarded rather than assumed to work.
function safeRead(store: Storage): string | null {
  try {
    return store.getItem(KEY)
  } catch {
    return null
  }
}

function parse(raw: string | null): LocalSession | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as LocalSession).id === 'string' &&
      typeof (parsed as LocalSession).email === 'string'
    ) {
      return parsed as LocalSession
    }
  } catch {
    // Corrupt value: treat as signed out rather than crashing the app shell.
  }
  return null
}

/** localStorage (Remember me) wins over sessionStorage when both somehow exist. */
export function readLocalSession(): LocalSession | null {
  if (typeof window === 'undefined') return null
  return (
    parse(safeRead(window.localStorage)) ?? parse(safeRead(window.sessionStorage))
  )
}

export function createLocalSession(
  email: string,
  kind: LocalSessionKind = 'local',
): LocalSession {
  return { id: newId(), email, kind, createdAt: new Date().toISOString() }
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
