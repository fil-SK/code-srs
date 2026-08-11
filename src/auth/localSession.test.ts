// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import {
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
