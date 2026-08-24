import { AuthProvider, iteraColors } from '@itera/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { createMobileAuthConfig } from '@/src/auth/mobileAuthConfig'
import { bindAppStateFocus } from '@/src/composition/appStateFocus'
import { composeMobileRepository } from '@/src/composition/composition'
import { createMobileQueryClient } from '@/src/composition/queryClient'
import { RootNavigator } from '@/src/composition/RootNavigator'
import { StatusScreen } from '@/src/components/system/StatusScreen'
import { isMobileSupabaseConfigured } from '@/src/data/supabaseClient'

// The mobile app's composition root - the counterpart of apps/web/src/main.tsx,
// and the only module in this workspace that decides what the app is made of.
//
// Order matters and is the same on both platforms: register the repository
// factory before anything can query, then provide the query client, then
// authentication, then routing. The registry constructs lazily, so this runs at
// import without opening a connection.
//
// Everything below the providers - screens, hooks, the review views - reaches
// data only through @itera/core. No component imports a backend, and nothing
// outside src/data/supabaseClient.ts knows this app is configured by Expo.
composeMobileRepository()
bindAppStateFocus()

export default function RootLayout() {
  // Built once for the life of the process. A new client on a re-render would
  // silently discard every cache entry.
  const [queryClient] = useState(createMobileQueryClient)
  const [authConfig] = useState(createMobileAuthConfig)

  // Cloud-only by decision (master plan D11): there is no native local backend
  // to fall back to, so an unconfigured build refuses to pretend. Checked before
  // AuthProvider mounts, because the shared engine resolves the Supabase client
  // during its bootstrap and would otherwise throw inside an effect where the
  // reason is much harder to see.
  if (!isMobileSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={iteraColors.canvas} />
        <StatusScreen
          detail="This build has no Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env.local, then restart Metro with the cache cleared."
          title="Itera is not configured"
        />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={iteraColors.canvas} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider config={authConfig}>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
