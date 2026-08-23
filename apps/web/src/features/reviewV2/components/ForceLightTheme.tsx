import type { ReactNode } from 'react'
import { ThemeContext } from '@/app/theme'

// Itera surfaces (both /design-preview/* and, now, production Review) are
// light-only for now (spec §36 defers dark mode for the MVP). CodeView picks
// its syntax-highlight palette (light vs oneDark) from the live ThemeContext,
// not from a CSS var, so it would otherwise follow whatever the app's global
// toggle currently is - visibly wrong under the app's dark default. This
// locally overrides useTheme() to a static 'light' value for its subtree
// only; it does not touch document.documentElement or localStorage, so the
// app's actual global theme/toggle is completely unaffected outside this
// subtree. Moved here (out of design-preview/) once production started
// reusing it too - see IteraSurface and docs/itera-decisions.md.
const LIGHT_ONLY = { theme: 'light' as const, setTheme: () => {}, toggle: () => {} }

export function ForceLightTheme({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={LIGHT_ONLY}>{children}</ThemeContext.Provider>
}
