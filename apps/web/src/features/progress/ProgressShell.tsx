import type { ReactNode } from 'react'
import { ProgressNav } from './ProgressNav'
import { useIsWideProgress } from './useIsWideProgress'

// Progress's own local sidebar inside the page content, structurally modeled
// on LibraryShell.tsx — not the global app chrome (TopNav/AppShell already
// cover that). `items-stretch` so the sidebar column matches the content
// column's height, letting ProgressNav's Settings row pin to the bottom via
// `mt-auto`, same as CollectionNav.
export function ProgressShell({ children }: { children: ReactNode }) {
  const isWide = useIsWideProgress()

  return isWide ? (
    <div className="grid grid-cols-[240px_1fr] items-stretch gap-8">
      <div className="border-r border-fliptap-border pr-2">
        <ProgressNav />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <div className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface">
        <ProgressNav />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
