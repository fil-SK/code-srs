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

  // Match the page ground so its decorative wash stays outside navigation.
  return isWide ? (
    <div className="grid min-h-[calc(100dvh-112px)] grid-cols-[220px_1fr] items-stretch gap-8">
      <div
        className="border-r border-fliptap-border pr-2"
        style={{ backgroundColor: 'var(--fliptap-canvas)' }}
      >
        <ProgressNav />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <div className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface">
        <ProgressNav compact />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
