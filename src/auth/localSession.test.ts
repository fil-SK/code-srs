// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import {
  browserSessionStore,
  clearLocalSession,
  createLocalSession,
  readLocalSession,
  writeLocalSession,
} from './localSession'

const KEY = 'itera.session'

describe('localSession', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('reads back nothing when no session was written', () => {
    expect(readLocalSession()).toBeNull()
  })

  it('persists to localStorage when remembered', () => {
    writeLocalSession(createLocalSession('a@b.com'), { remember: true })

    expect(window.localStorage.getItem(KEY)).toBeTruthy()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(readLocalSession()?.email).toBe('a@b.com')
  })

  it('persists only to sessionStorage when not remembered', () => {
    writeLocalSession(createLocalSession('a@b.com'), { remember: false })

    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBeTruthy()
    expect(readLocalSession()?.email).toBe('a@b.com')
  })

  it('does not leave a remembered session shadowing a later un-remembered one', () => {
    writeLocalSession(createLocalSession('old@b.com'), { remember: true })
    writeLocalSession(createLocalSession('new@b.com'), { remember: false })

    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(readLocalSession()?.email).toBe('new@b.com')
  })

  it('records the session kind', () => {
    writeLocalSession(createLocalSession('demo@itera.local', 'demo'), { remember: false })
    expect(readLocalSession()?.kind).toBe('demo')
  })

  it('clears both stores', () => {
    writeLocalSession(createLocalSession('a@b.com'), { remember: true })
    clearLocalSession()

    expect(readLocalSession()).toBeNull()
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('treats a corrupt stored value as signed out instead of throwing', () => {
    window.localStorage.setItem(KEY, 'not json')
    expect(readLocalSession()).toBeNull()
  })
})

// The same three operations as @itera/core's LocalSessionStore sees them. The
// shared auth layer only ever reaches storage through this object, so it is
// what actually has to behave, not just the named functions beside it.
describe('browserSessionStore', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('round-trips a remembered session through localStorage', () => {
    browserSessionStore.write(createLocalSession('a@b.com'), { remember: true })

    expect(window.localStorage.getItem(KEY)).toBeTruthy()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(browserSessionStore.read()?.email).toBe('a@b.com')
  })

  it('round-trips a non-remembered session through sessionStorage', () => {
    browserSessionStore.write(createLocalSession('a@b.com'), { remember: false })

    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBeTruthy()
    expect(browserSessionStore.read()?.email).toBe('a@b.com')
  })

  it('clears both stores', () => {
    browserSessionStore.write(createLocalSession('a@b.com'), { remember: true })
    browserSessionStore.clear()

    expect(browserSessionStore.read()).toBeNull()
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('reads a corrupt stored value as signed out', () => {
    window.sessionStorage.setItem(KEY, '{ half-written')
    expect(browserSessionStore.read()).toBeNull()
  })
})
