import { useAuth } from '@itera/core'

import { SignInScreen } from '@/src/components/auth/SignInScreen'
import { getMobileSupabase } from '@/src/data/supabaseClient'

// The route binds the screen to Supabase; the screen itself knows only two
// promises. Verifying does not navigate: resolving updates the Supabase session,
// the shared auth engine's onAuthStateChange emits, and RootNavigator's guard
// swaps the group. One source of truth for "am I signed in", as core intends.
export default function SignInRoute() {
  const { sessionError } = useAuth()

  return (
    <SignInScreen
      bootstrapError={sessionError}
      onRequestCode={async (email) => {
        const { error } = await getMobileSupabase().auth.signInWithOtp({
          email,
          // A learner typing a six-digit code has an account by definition of
          // having received one, and leaving this true would let a typo in the
          // address silently create a second empty workspace.
          options: { shouldCreateUser: true },
        })
        if (error) throw error
      }}
      onVerifyCode={async (email, token) => {
        const { error } = await getMobileSupabase().auth.verifyOtp({
          email,
          token,
          type: 'email',
        })
        if (error) throw error
      }}
    />
  )
}
