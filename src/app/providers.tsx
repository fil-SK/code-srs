import { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthProvider'
import { DialogProvider } from '@/components/ui/dialogs'
import { ThemeProvider } from './theme'
import { queryClient } from './queryClient'

// App-wide providers: data layer (TanStack Query), auth session, theme, and
// the confirm/prompt/alert dialogs that replace the window.* builtins.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <DialogProvider>{children}</DialogProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
