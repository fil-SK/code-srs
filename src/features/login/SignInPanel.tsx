import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, FlaskConical, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { fieldClass } from '@/components/ui/Field'
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client'
import { cn } from '@/lib/cn'

// The sign-in form. Two modes, one layout:
//
//   local (default)  — the app is local-first and has no accounts server. This
//                      is a development/demo shell: the password is never
//                      stored, sent, or checked against anything. It exists so
//                      the product has a real session boundary
//                      (src/auth/localSession.ts) rather than an app that
//                      simply opens.
//   Supabase         — the only real authentication this project has is
//                      magic-link OTP, so the password field and Remember me
//                      are hidden and Sign in mails a link, exactly as the
//                      previous login screen did. No password auth was added.

// Builds on the shared input styling rather than restating it: the login
// inputs are taller and carry leading icons, and they sit on white instead of
// the subtle fill the editors use.
const inputClass = cn(
  fieldClass,
  'h-11 rounded-itera-control border-itera-border bg-itera-surface pl-10 text-[14px] placeholder:text-itera-muted-light',
  'focus:border-itera-accent focus-visible:ring-2 focus-visible:ring-itera-accent/25',
)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[13px] font-semibold text-itera-ink-brand"
    >
      {children}
    </label>
  )
}

function LeadingIcon({ icon: Icon }: { icon: typeof Mail }) {
  return (
    <Icon
      size={17}
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-itera-muted-light"
    />
  )
}

export function SignInPanel({ redirectTo }: { redirectTo: string }) {
  const navigate = useNavigate()
  const { signInLocal, signInDemo } = useAuth()

  const emailId = useId()
  const passwordId = useId()
  const rememberId = useId()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showResetNote, setShowResetNote] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [magicLink, setMagicLink] = useState<'idle' | 'sending' | 'sent'>('idle')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()

    const next: typeof errors = {}
    if (!trimmed) next.email = 'Enter your email address.'
    else if (!EMAIL_PATTERN.test(trimmed)) next.email = 'Enter a valid email address.'
    if (!isSupabaseConfigured && !password) next.password = 'Enter your password.'

    setErrors(next)
    if (next.email) {
      emailRef.current?.focus()
      return
    }
    if (next.password) {
      passwordRef.current?.focus()
      return
    }

    if (isSupabaseConfigured) {
      void sendMagicLink(trimmed)
      return
    }

    signInLocal(trimmed, { remember })
    navigate(redirectTo, { replace: true })
  }

  async function sendMagicLink(to: string) {
    setMagicLink('sending')
    const { error } = await getSupabase().auth.signInWithOtp({
      email: to,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setMagicLink('idle')
      setErrors({ form: error.message })
    } else {
      setMagicLink('sent')
    }
  }

  function handleDemo() {
    signInDemo()
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="w-full rounded-[15px] border border-itera-border bg-itera-surface p-6 shadow-[0_1px_3px_rgba(23,32,51,0.04)] sm:p-7">
      <h2 className="text-[27px] font-[650] leading-[1.15] tracking-[-0.02em] text-itera-ink-brand">
        Sign in
      </h2>
      <p className="mt-1 text-[14px] font-normal leading-[1.5] text-itera-muted">
        Access your Itera workspace
      </p>

      {magicLink === 'sent' ? (
        <div className="mt-7 rounded-itera-control border border-itera-success/30 bg-itera-success-soft p-4 text-sm text-itera-ink">
          Check <span className="font-semibold">{email.trim()}</span> for a sign-in link.
          You can close this tab once you have clicked it.
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5">
          <div>
            <Label htmlFor={emailId}>Email</Label>
            <div className="relative">
              <LeadingIcon icon={Mail} />
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? `${emailId}-error` : undefined}
                className={inputClass}
              />
            </div>
            {errors.email && (
              <p id={`${emailId}-error`} role="alert" className="mt-1.5 text-[13px] text-itera-error">
                {errors.email}
              </p>
            )}
          </div>

          {!isSupabaseConfigured && (
            <div className="mt-4">
              <Label htmlFor={passwordId}>Password</Label>
              <div className="relative">
                <LeadingIcon icon={Lock} />
                <input
                  ref={passwordRef}
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? `${passwordId}-error` : undefined}
                  className={cn(inputClass, 'pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-controls={passwordId}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-itera-control text-itera-muted-light hover:text-itera-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-itera-accent"
                >
                  {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
              {errors.password && (
                <p
                  id={`${passwordId}-error`}
                  role="alert"
                  className="mt-1.5 text-[13px] text-itera-error"
                >
                  {errors.password}
                </p>
              )}
            </div>
          )}

          {!isSupabaseConfigured && (
            <>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <input
                    id={rememberId}
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded-[4px] border-itera-border-strong accent-[var(--itera-accent)]"
                  />
                  <label htmlFor={rememberId} className="text-[14px] text-itera-ink">
                    Remember me
                  </label>
                </div>
                {/* No password-reset backend exists (and none is being built
                    for this milestone), so the link states that rather than
                    leading somewhere dead. aria-disabled, not `disabled`, so
                    keyboard users still reach it — same pattern as the account
                    menu's placeholder rows. */}
                <button
                  type="button"
                  aria-disabled="true"
                  aria-expanded={showResetNote}
                  onClick={() => setShowResetNote((v) => !v)}
                  className="rounded-itera-control text-[14px] font-semibold text-itera-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-itera-accent"
                >
                  Forgot password?
                </button>
              </div>
              {showResetNote && (
                <p className="mt-2 text-[13px] text-itera-muted">
                  Password reset is not available yet. Itera stores everything locally, so
                  use Continue with demo workspace to get back in.
                </p>
              )}
            </>
          )}

          {errors.form && (
            <p role="alert" className="mt-4 text-[13px] text-itera-error">
              {errors.form}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={magicLink === 'sending'}
            className="mt-5 h-11 w-full rounded-itera-control text-[14px]"
          >
            {isSupabaseConfigured
              ? magicLink === 'sending'
                ? 'Sending…'
                : 'Send magic link'
              : 'Sign in'}
          </Button>
        </form>
      )}

      {!isSupabaseConfigured && magicLink !== 'sent' && (
        <>
          <div className="my-4 flex items-center gap-4">
            <span aria-hidden="true" className="h-px flex-1 bg-itera-border" />
            <span className="text-[13px] text-itera-muted">or</span>
            <span aria-hidden="true" className="h-px flex-1 bg-itera-border" />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleDemo}
            className="h-11 w-full rounded-itera-control border-itera-border bg-itera-surface text-[14px] font-semibold text-itera-ink-brand hover:border-itera-border-strong"
          >
            <FlaskConical size={17} aria-hidden="true" className="text-itera-muted" />
            Continue with demo workspace
          </Button>
        </>
      )}

      <p className="mt-5 flex items-center gap-2 text-[12px] text-itera-muted">
        <Lock size={14} aria-hidden="true" className="flex-none" />
        Local-first by design. Your learning stays with you.
      </p>
    </div>
  )
}
