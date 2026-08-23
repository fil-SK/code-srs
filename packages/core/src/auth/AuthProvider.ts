import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createAuthEngine } from './authEngine'
import type { AuthConfig, AuthValue } from './types'

// The React binding over the shared auth engine, and the only one. React is a
// peer dependency of this package and runs unmodified on React Native, so a
// second provider per platform would buy nothing and would be somewhere for the
// two to drift apart - which, for the mode rule in resolveAuthState, is the
// exact bug this package exists to make unrepeatable.
//
// Written with createElement rather than JSX so this file stays `.ts`: core
// compiles with no `jsx` option and no DOM lib, and the platform-neutrality
// guard reads `.ts` sources off disk. One createElement call is a smaller price
// than relaxing the TypeScript configuration and widening the guard, and JSX
// would buy nothing here - the component renders exactly one element.
//
// Everything platform-specific arrives in `config`: the mode decision, the
// session store, and a getter for the Supabase client. This file reads no
// storage, no environment and no route.

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({
  config,
  children,
}: {
  config: AuthConfig
  children: ReactNode
}) {
  // The config is composition-time and does not change for the life of the app,
  // so the engine is built once. Handing this component a different config on a
  // later render would be a composition bug, not a supported reconfiguration.
  const [engine] = useState(() => createAuthEngine(config))

  useEffect(() => engine.start(), [engine])

  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot)

  const value = useMemo<AuthValue>(
    () => ({
      ...snapshot,
      email: snapshot.identity?.email,
      signInLocal: engine.signInLocal,
      signInDemo: engine.signInDemo,
      signOut: engine.signOut,
    }),
    [snapshot, engine],
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
