import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ForceLightTheme } from './ForceLightTheme'

// Shared root for any tree rendered in the FlipTap visual system: ForceLightTheme
// (see that file) plus `.fliptap-scope` (the namespaced token set, src/index.css).
// Used by both /design-preview/* (via PreviewShell, which adds its own banner)
// and the production Review route once it renders v2 interactions - one
// mechanism, not a separate "real" vs "preview" copy of it.
export function FlipTapSurface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ForceLightTheme>
      <div className={cn('fliptap-scope', className)}>{children}</div>
    </ForceLightTheme>
  )
}
