import { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthProvider'
import { ThemeProvider } from './theme'
import { queryClient } from './queryClient'

// App-wide providers: data layer (TanStack Query), auth session, and theme.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
