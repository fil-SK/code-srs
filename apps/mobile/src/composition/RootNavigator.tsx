import { useAuth } from '@itera/core'
import { Stack } from 'expo-router'

import { StatusScreen } from '@/src/components/system/StatusScreen'

// The authenticated boundary, as one decision in one place.
//
// Split out of app/_layout.tsx so the decision can be tested without a router:
// the layout file is composition (providers, in a fixed order), and this is the
// rule about what may render.
//
// Two mechanisms, deliberately, because they answer different questions:
//
//   1. While the session bootstrap is still running, no navigator is rendered at
//      all. A guard evaluated against `isAuthenticated: false` mid-bootstrap
//      would mount the sign-in screen for one frame and then replace it, which
//      reads as a flash of the wrong screen every cold start. Not rendering is
//      the only way to be sure there is no such frame.
//
//   2. Once decided, `Stack.Protected` removes the other group from the
//      navigator entirely rather than redirecting away from it. A protected
//      route that does not exist cannot be reached by a deep link, a stale
//      history entry, or a `router.push` from code that forgot to check - which
//      a redirect-based guard only fixes after the fact. Expo Router also
//      restores a route the visitor asked for once its guard opens, so the
//      requested destination survives sign-in without a redirect parameter.
export function RootNavigator() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return <StatusScreen busy title="Signing you in…" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  )
}
