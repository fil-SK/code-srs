import { AUTH_ERROR_COPY, authErrorMessage, classifyAuthError, looksLikeEmail } from './authErrorCopy'

// The point of these cases is not the exact wording. It is that no path returns
// anything except one of the fixed sentences, so a change in GoTrue's phrasing
// can never surface to a learner.
const ALLOWED = Object.values(AUTH_ERROR_COPY)

describe('classifyAuthError', () => {
  it('reads a transport failure as a connection problem, not a bad code', () => {
    expect(classifyAuthError(new TypeError('Network request failed'))).toBe('network')
    expect(classifyAuthError(new TypeError('Failed to fetch'))).toBe('network')
  })

  it('reads a rejected code as an invalid code', () => {
    expect(classifyAuthError({ status: 403, message: 'Token has expired or is invalid' })).toBe(
      'expiredCode',
    )
    expect(classifyAuthError({ status: 400, message: 'invalid token' })).toBe('invalidCode')
  })

  it('reads throttling as throttling', () => {
    expect(classifyAuthError({ status: 429, message: 'rate limit' })).toBe('rateLimited')
    expect(classifyAuthError({ code: 'over_email_send_rate_limit' })).toBe('rateLimited')
  })

  it('falls through to the generic line rather than echoing an unknown failure', () => {
    expect(classifyAuthError({ status: 500, message: 'internal error at pod-42' })).toBe('generic')
    expect(classifyAuthError('some string')).toBe('generic')
    expect(classifyAuthError(null)).toBe('generic')
    expect(classifyAuthError(undefined)).toBe('generic')
  })
})

describe('authErrorMessage', () => {
  it('only ever returns approved copy', () => {
    const failures: unknown[] = [
      new TypeError('Network request failed'),
      { status: 400, message: 'AuthApiError: Invalid login credentials' },
      { status: 429 },
      { status: 500, message: 'pg: connection refused at 10.0.0.4:5432' },
      new Error('supabase.co/auth/v1/verify returned 502'),
      null,
      42,
    ]
    for (const failure of failures) {
      expect(ALLOWED).toContain(authErrorMessage(failure))
    }
  })

  it('never leaks vendor, transport or infrastructure vocabulary', () => {
    const leaky = {
      status: 500,
      message: 'AuthApiError from https://abc.supabase.co/auth/v1/token: fetch ECONNREFUSED',
    }
    const shown = authErrorMessage(leaky).toLowerCase()
    for (const word of ['supabase', 'autherror', 'http', 'fetch', 'econnrefused', 'token']) {
      expect(shown).not.toContain(word)
    }
  })
})

describe('looksLikeEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(looksLikeEmail('learner@example.com')).toBe(true)
    expect(looksLikeEmail('  learner@example.com  ')).toBe(true)
  })

  it('rejects obvious typos without pretending to be a validator', () => {
    expect(looksLikeEmail('')).toBe(false)
    expect(looksLikeEmail('learner')).toBe(false)
    expect(looksLikeEmail('@example.com')).toBe(false)
    expect(looksLikeEmail('learner@')).toBe(false)
    expect(looksLikeEmail('learner @example.com')).toBe(false)
  })
})
