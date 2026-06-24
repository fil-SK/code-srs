import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

// CSS-only 3D flip (see .flip rules in index.css). Both faces occupy one grid
// cell, so the container sizes to the taller face without measuring.
// `faceClassName` styles each face as a card surface; the front is clickable.
export function FlipCard({
  front,
  back,
  flipped,
  faceClassName,
  onFrontClick,
}: {
  front: ReactNode
  back: ReactNode
  flipped: boolean
  faceClassName?: string
  onFrontClick?: () => void
}) {
  return (
    <div className={cn('flip', flipped && 'is-flipped')}>
      <div
        className={cn('flip-face flip-front', faceClassName, onFrontClick && 'cursor-pointer')}
        onClick={onFrontClick}
      >
        {front}
      </div>
      <div className={cn('flip-face flip-back', faceClassName)}>{back}</div>
    </div>
  )
}
