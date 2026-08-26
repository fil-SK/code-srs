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
import { mobileRuntimeMode } from '@/src/config/mobileRuntimeMode'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
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
//
// Two runtime modes, decided once in src/config/mobileRuntimeMode.ts and read
// here for both the repository and auth, so backend mode and auth mode cannot
// disagree (the same single-value rule apps/web/src/main.tsx follows).
//
// Both modes register a backend, and each registers exactly one: Supabase here
// at module scope for cloud, and the in-memory demo backend from inside
// DemoWorkspaceProvider for demo (which is what lets the repository seed and the
// notification inbox come from one `createDemoSeed` call). Demo mode used to
// register nothing, on the reasoning that an unconfigured `getRepository()`
// would fail loudly if a screen queried real data by accident. That reasoning
// is spent: the demo product path now queries deliberately, through the same
// shared hooks web uses, and the thing it must not reach is Supabase - which it
// cannot, because nothing on this path constructs a client.
if (mobileRuntimeMode === 'cloud') {
  composeMobileRepository()
}
bindAppStateFocus()

export default function RootLayout() {
  // Built once for the life of the process. A new client on a re-render would
  // silently discard every cache entry.
  const [queryClient] = useState(createMobileQueryClient)
  const [authConfig] = useState(createMobileAuthConfig)

  // Cloud mode still refuses to pretend: there is no native local backend to
  // fall back to, so a cloud build with no configuration says so. Checked before
  // AuthProvider mounts, because the shared engine resolves the Supabase client
  // during its bootstrap and would otherwise throw inside an effect where the
  // reason is much harder to see.
  //
  // Demo mode never reaches this: it needs no credentials, opens the product
  // immediately, and makes no cloud request.
  if (mobileRuntimeMode === 'cloud' && !isMobileSupabaseConfigured) {
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

  // The provider order is the same in both modes; demo adds one wrapper rather
  // than forking the tree, so there is only ever one composition to reason about.
  const navigator =
    mobileRuntimeMode === 'demo' ? (
      <DemoWorkspaceProvider>
        <RootNavigator />
      </DemoWorkspaceProvider>
    ) : (
      <RootNavigator />
    )

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={iteraColors.canvas} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider config={authConfig}>{navigator}</AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
