import type { ReactNode } from 'react'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// Chrome-free wrapper for every /design-preview/* route: no sidebar, no top
// nav, no header actions, no production layout of any kind — this is not
// AppShell with parts hidden, it is a structurally separate route registered
// as a sibling of AppShell in router.tsx (see docs/archive/itera-redesign-plan.md
// Phase B). The Itera surface itself (ForceLightTheme + .itera-scope) is
// shared with production via IteraSurface; only the "not part of the live
// app" banner is specific to this preview wrapper.
export function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <IteraSurface className="min-h-screen">
      <div className="border-b border-itera-border bg-itera-surface px-4 py-2 text-center text-xs font-medium text-itera-muted">
        Design preview — not part of the live app
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</div>
    </IteraSurface>
  )
}
