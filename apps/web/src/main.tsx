import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { configureRepository, SupabaseRepository } from '@itera/core'
import './index.css'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import { AuthGate } from '@/auth/AuthGate'
import { createWebAuthConfig } from '@/auth/webAuthConfig'
import { DexieRepository } from '@/data/dexie/DexieRepository'
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client'

// The web app's composition, and the only place it is made. Reading the
// configuration and building the browser client is this layer's job:
// SupabaseRepository and the shared auth layer each take what they need and
// never look at the environment, and @itera/core has no default backend and no
// default auth mode at all.
//
// One platform decision, two configured shared systems. `cloudEnabled` is read
// once here and nothing else in the app translates configuration into a mode, so
// the backend and the authentication model cannot disagree - a stale local
// session admitting someone to a cloud-backed app is exactly what two
// independent reads of this predicate produced once (audit P1-3). Product code
// asks `useAuth()` for the mode instead.
//
// Before render, and before any query can run. The repository factory is not
// called here - the registry constructs on first use - but registering it is
// what makes that first use resolve to something.
const cloudEnabled = isSupabaseConfigured

configureRepository(() =>
  cloudEnabled ? new SupabaseRepository(getSupabase()) : new DexieRepository(),
)

const authConfig = createWebAuthConfig(cloudEnabled)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers auth={authConfig}>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </Providers>
  </StrictMode>,
)
