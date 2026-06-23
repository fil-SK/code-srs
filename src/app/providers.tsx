import { type ReactNode } from 'react'
import { ThemeProvider } from './theme'

// App-wide providers. TanStack Query's QueryClientProvider is added here in M1.
export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
