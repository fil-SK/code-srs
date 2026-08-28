import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

// The one loading placeholder in the app, and the whole of the loading
// convention: a route paints its own frame - nav, headings, sidebars, toolbars,
// the review strip - and swaps only its data regions for these. Nothing here
// replaces a page with the word "Loading", which is what every one of these
// call sites used to do.
//
// Purely decorative on its own: the surrounding region carries `aria-busy` and
// one `role="status"` line, so assistive tech is told once rather than once per
// grey box.
export function Skeleton({
  className,
  style,
}: {
  className?: string
  // Grid placement and explicit heights come through here: a placeholder is
  // only useful if it occupies the space its real content will.
  style?: CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn('itera-skeleton bg-itera-navy-soft', className)}
    />
  )
}

// Wraps a region whose content is still resolving. `role="status"` plus a
// single visually hidden sentence is the entire announcement; the boxes inside
// stay silent.
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div aria-busy="true" className={className}>
      <span role="status" className="sr-only">
        {label}
      </span>
      {children}
    </div>
  )
}
