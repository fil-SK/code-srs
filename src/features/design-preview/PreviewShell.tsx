import type { ReactNode } from 'react'
import { ForceLightTheme } from './ForceLightTheme'

// Chrome-free wrapper for every /design-preview/* route: no sidebar, no top
// nav, no header actions, no production layout of any kind — this is not
// AppShell with parts hidden, it is a structurally separate route registered
// as a sibling of AppShell in router.tsx (see docs/itera-redesign-plan.md
// Phase B). Applies .itera-scope (src/index.css) so every itera-* token and
// the scoped re-point of the legacy semantic vars are active underneath it.
export function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <ForceLightTheme>
      <div className="itera-scope min-h-screen">
        <div className="border-b border-itera-border bg-itera-surface px-4 py-2 text-center text-xs font-medium text-itera-muted">
          Design preview — not part of the live app
        </div>
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</div>
      </div>
    </ForceLightTheme>
  )
}
