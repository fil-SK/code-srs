import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ForceLightTheme } from './ForceLightTheme'

// Shared root for any tree rendered in the Itera visual system: ForceLightTheme
// (see that file) plus `.itera-scope` (the namespaced token set, src/index.css).
// Used by both /design-preview/* (via PreviewShell, which adds its own banner)
// and the production Review route once it renders v2 interactions - one
// mechanism, not a separate "real" vs "preview" copy of it.
export function IteraSurface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ForceLightTheme>
      <div className={cn('itera-scope', className)}>{children}</div>
    </ForceLightTheme>
  )
}
