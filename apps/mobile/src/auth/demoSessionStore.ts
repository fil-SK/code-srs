import type { LocalSession, LocalSessionStore } from '@itera/core'

// The demo workspace's session record, as core's LocalSessionStore.
//
// Core already defines exactly this concept: a LocalSession of kind 'demo' is
// "a development/demo shell, not authentication - no password is stored,
// verified or transmitted". Demo mode uses that seam for what it was defined
// for rather than adding a second way to be signed in.
//
// The record is pre-seeded rather than minted by signInDemo(), because demo
// mode has no sign-in step: createAuthEngine reads store.read() while it is
// being constructed, so returning a record here makes the first rendered frame
// already authenticated. There is no bootstrap, no OTP and no loading screen,
// and start() is a no-op in local mode, so no Supabase client is ever built.
//
// write() and clear() are inert on purpose. Nothing may change who the demo
// visitor is, and nothing is persisted: demo state lives for the life of the
// process and resets on a full app restart, which is the documented intent.

export const DEMO_SESSION: LocalSession = {
  id: 'demo-workspace',
  email: 'demo@itera.app',
  kind: 'demo',
  createdAt: '2026-08-24T00:00:00.000Z',
}

export const demoSessionStore: LocalSessionStore = {
  read: () => DEMO_SESSION,
  write: () => {},
  clear: () => {},
}
