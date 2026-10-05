import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'
export type ThemePreference = Theme | 'system'

const STORAGE_KEY = 'code-srs-theme'

interface ThemeContextValue {
  theme: Theme
  preference: ThemePreference
  setTheme: (theme: ThemePreference) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  } catch {
    // A blocked preference store must not prevent the app from opening.
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const restore = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      setPreference(getInitialPreference())
    }
    window.addEventListener('storage', restore)
    return () => window.removeEventListener('storage', restore)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', theme === 'dark' ? '#0f1724' : '#f6f7f9',
    )
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      // ignore persistence failures
    }
  }, [preference])

  const setTheme = useCallback((next: ThemePreference) => setPreference(next), [])
  const toggle = useCallback(
    () => setPreference(theme === 'dark' ? 'light' : 'dark'),
    [theme],
  )

  return (
    <ThemeContext.Provider value={{ theme, preference, setTheme, toggle }}>
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
