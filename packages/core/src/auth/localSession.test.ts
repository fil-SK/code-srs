import { describe, expect, it } from 'vitest'
import { createLocalSession, DEMO_EMAIL, parseLocalSession } from './localSession'

describe('createLocalSession', () => {
  it('mints a local session with an id and a timestamp', () => {
    const session = createLocalSession('someone@local.test')
    expect(session.email).toBe('someone@local.test')
    expect(session.kind).toBe('local')
    expect(session.id).not.toBe('')
    expect(Number.isNaN(Date.parse(session.createdAt))).toBe(false)
  })

  it('mints the demo workspace under its own kind', () => {
    expect(createLocalSession(DEMO_EMAIL, 'demo')).toMatchObject({
      email: 'demo@itera.local',
      kind: 'demo',
    })
  })

  it('gives every session a distinct id', () => {
    expect(createLocalSession('a@local.test').id).not.toBe(createLocalSession('a@local.test').id)
  })
})

describe('parseLocalSession', () => {
  it('round-trips a stored record', () => {
    const session = createLocalSession('someone@local.test')
    expect(parseLocalSession(JSON.stringify(session))).toEqual(session)
  })

  // A corrupt value reads as signed out rather than crashing the app shell:
  // this runs during the first render, and there is no recovery to offer.
  it.each([
    ['nothing stored', null],
    ['an empty string', ''],
    ['not JSON at all', 'not json'],
    ['a JSON primitive', '"signed-in"'],
    ['null', 'null'],
    ['an object missing every field', '{}'],
    ['a record with no email', JSON.stringify({ id: 'x' })],
    ['a record with a non-string id', JSON.stringify({ id: 7, email: 'a@b.c' })],
  ])('reads %s as signed out', (_label, raw) => {
    expect(parseLocalSession(raw)).toBeNull()
  })
})
