import { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, type AuthConfig } from '@itera/core'
import { DialogProvider } from '@/components/ui/dialogs'
import { ThemeProvider } from './theme'
import { queryClient } from './queryClient'

// App-wide providers: data layer (TanStack Query), auth session, theme, and
// the confirm/prompt/alert dialogs that replace the window.* builtins.
//
// The auth config arrives as a prop rather than through a registry of its own:
// this tree is rendered from src/main.tsx, which is already the composition
// root, so passing it down keeps the platform decision in one file without
// adding a second global that the repository registry could deadlock against.
export function Providers({ auth, children }: { auth: AuthConfig; children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider config={auth}>
        <ThemeProvider>
          <DialogProvider>{children}</DialogProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
