import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'code-srs-theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

// Exported so a subtree can locally override the active theme without touching
// document.documentElement or localStorage — see
// src/features/reviewV2/components/ForceLightTheme.tsx, which IteraSurface
// composes to pin the whole app to light. `Theme` keeps its 'dark' member
// because CodeView/CodeEditor read it to choose between the light and oneDark
// syntax palettes; it is not a user-facing setting (there is no toggle).
// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | null>(null)

// Light is the fallback because the app is light-only: no dark palette exists,
// and IteraSurface pins the whole tree to light via ForceLightTheme anyway. A
// 'dark' fallback here used to write data-theme="dark" back onto <html> on
// mount, which darkened the pre-router AuthGate screen (it renders outside
// .itera-scope, so it reads --bg from :root directly).
function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore persistence failures
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggle = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
