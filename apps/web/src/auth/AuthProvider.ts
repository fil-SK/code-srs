// Compatibility shim. The provider, the context and the auth policy behind them
// all live in @fliptap/core now; this file exists so the app's existing
// `@/auth/AuthProvider` imports keep resolving. It contains no auth logic, and
// new code should import from @fliptap/core directly.
//
// The web-specific half of authentication is next door: localSession.ts (the
// browser session store), webAuthConfig.ts (what this platform injects),
// AuthGate.tsx and RequireAuth.tsx (routing).
export { AuthProvider, useAuth } from '@fliptap/core'
export type { AuthIdentity, AuthValue, AuthMode } from '@fliptap/core'
