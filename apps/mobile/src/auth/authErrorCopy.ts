// Friendly copy for every way sign-in can fail, and the one place a raw error is
// allowed to be looked at.
//
// The rule this enforces is the same one core states for review persistence: the
// learner is told what happened and what to do, never what the transport said.
// "AuthApiError: Token has expired or is invalid" and "TypeError: Network
// request failed" are diagnostics, not messages - they name our vendor, leak our
// internals, and tell someone holding a phone nothing they can act on.
//
// Classification is by status code first and a narrow substring match second,
// because GoTrue's wording is not a stable contract. Anything unrecognized falls
// through to the generic line rather than being echoed.

export const AUTH_ERROR_COPY = {
  invalidCode: "That code didn't work. Check the six digits, or send a new one.",
  expiredCode: 'That code has expired. Send a new one to try again.',
  rateLimited: 'Too many attempts just now. Wait a minute, then try again.',
  invalidEmail: "That doesn't look like an email address.",
  network: "Couldn't reach the account service. Check your connection and try again.",
  generic: 'Something went wrong. Try again in a moment.',
} as const

export type AuthErrorKind = keyof typeof AUTH_ERROR_COPY

interface ErrorShape {
  status?: number
  code?: string
  message?: string
}

function read(error: unknown): ErrorShape {
  if (typeof error !== 'object' || error === null) return {}
  const { status, code, message } = error as ErrorShape
  return {
    status: typeof status === 'number' ? status : undefined,
    code: typeof code === 'string' ? code.toLowerCase() : undefined,
    message: typeof message === 'string' ? message.toLowerCase() : undefined,
  }
}

export function classifyAuthError(error: unknown): AuthErrorKind {
  const { status, code, message } = read(error)

  // A fetch that never reached a server has no status at all. Checked first so a
  // transport failure is never reported as a bad code.
  if (status === undefined && message?.includes('network')) return 'network'
  if (status === undefined && message?.includes('fetch')) return 'network'

  if (status === 429 || code === 'over_email_send_rate_limit') return 'rateLimited'
  if (code === 'otp_expired' || message?.includes('expired')) return 'expiredCode'
  if (code === 'validation_failed' && message?.includes('email')) return 'invalidEmail'
  if (status === 400 || status === 401 || status === 403) return 'invalidCode'

  return 'generic'
}

/** The only string from a failure that may ever reach the screen. */
export function authErrorMessage(error: unknown): string {
  return AUTH_ERROR_COPY[classifyAuthError(error)]
}

/**
 * The client-side check, kept deliberately loose. Its job is to stop an obvious
 * typo before a network round trip, not to decide what a valid address is - that
 * belongs to the service that has to deliver mail to it.
 */
export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim()
  const at = trimmed.indexOf('@')
  return at > 0 && at < trimmed.length - 1 && !/\s/.test(trimmed)
}
