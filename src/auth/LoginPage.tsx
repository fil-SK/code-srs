import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { getSupabase } from '@/data/supabase/client'

// Single-user magic-link sign-in. Entering an email sends a one-time login link;
// clicking it returns to the app with a session (detectSessionInUrl handles it).
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setError('')
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setStatus('error')
      setError(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-card border border-border bg-panel p-7 shadow-[var(--shadow)]">
        <h1 className="text-xl font-bold">code-srs</h1>
        <p className="mt-1 text-sm text-muted">
          Sign in to sync your cards across devices.
        </p>

        {status === 'sent' ? (
          <div className="mt-6 rounded-[10px] border border-green bg-green/10 p-4 text-sm">
            Check <span className="font-semibold">{email}</span> for a sign-in
            link. You can close this tab once you click it.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[9px] border border-border bg-panel-2 px-3 py-2 text-sm outline-none focus-visible:border-accent"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </Button>
            {status === 'error' && (
              <p className="text-sm text-red">{error}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
