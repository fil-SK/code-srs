import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { configureRepository, SupabaseRepository } from '@itera/core'
import './index.css'
import { Providers } from '@/app/providers'
import { router } from '@/app/router'
import { AuthGate } from '@/auth/AuthGate'
import { DexieRepository } from '@/data/dexie/DexieRepository'
import { getSupabase, isSupabaseConfigured } from '@/data/supabase/client'

// The web app's storage composition, and the only place it is made. Reading the
// configuration and building the browser client is this layer's job:
// SupabaseRepository takes a ready client and never looks at the environment,
// and @itera/core has no default backend at all.
//
// The same `isSupabaseConfigured` value drives AuthProvider, so backend mode and
// authentication mode cannot disagree (audit P1-3).
//
// Before render, and before any query can run. The factory is not called here -
// the registry constructs on first use - but registering it is what makes that
// first use resolve to something.
configureRepository(() =>
  isSupabaseConfigured ? new SupabaseRepository(getSupabase()) : new DexieRepository(),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </Providers>
  </StrictMode>,
)
