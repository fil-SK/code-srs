import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// CSS-only 3D flip (see .flip rules in index.css). Both faces occupy one grid
// cell, so the container sizes to the taller face without measuring.
export function FlipCard({
  front,
  back,
  flipped,
}: {
  front: ReactNode
  back: ReactNode
  flipped: boolean
}) {
  return (
    <div className={cn('flip', flipped && 'is-flipped')}>
      <div className="flip-face flip-front">{front}</div>
      <div className="flip-face flip-back">{back}</div>
    </div>
  )
}
