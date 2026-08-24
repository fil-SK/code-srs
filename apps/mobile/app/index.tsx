import { useAuth } from '@itera/core'
import { Redirect } from 'expo-router'

// The entry URL. Expo Go opens the app at '/', which belongs to neither group,
// so this decides where that lands.
//
// It is a convenience, not the security boundary: RootNavigator's Stack.Protected
// guards are what make a protected route unreachable. This only avoids a
// not-found screen for the one path that has no home of its own.
export default function Index() {
  const { isAuthenticated } = useAuth()
  return <Redirect href={isAuthenticated ? '/today' : '/sign-in'} />
}
