import { newId } from '../lib/id'
import type { LocalSession, LocalSessionKind } from './types'

// The local session's shape and the rules for reading one back, separated from
// how any one platform stores it. What a local/demo session *means* is shared;
// which key it sits under and which store it sits in is not.

/** The demo workspace's fixed identity. `.local` is reserved, so it can never
 *  collide with a real address someone signs in with. */
export const DEMO_EMAIL = 'demo@itera.local'

export function createLocalSession(
  email: string,
  kind: LocalSessionKind = 'local',
): LocalSession {
  return { id: newId(), email, kind, createdAt: new Date().toISOString() }
}

/**
 * Read a stored record back. A corrupt or half-written value is signed out, not
 * a crash: this runs during the first render of the app shell, and there is no
 * recovery a learner could perform anyway.
 */
export function parseLocalSession(raw: string | null): LocalSession | null {
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
    // Not JSON at all: same answer, signed out.
  }
  return null
}
