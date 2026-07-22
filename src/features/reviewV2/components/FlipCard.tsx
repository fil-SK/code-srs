import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Itera's flip primitive. NOT the shared src/components/ui/FlipCard.tsx —
// that one's front face is a plain <div onClick>, with no tabIndex, role, or
// keyboard handler, so it fails keyboard activation and accessible semantics.
// Rather than edit the file production imports, this is a small, separate
// replacement using the same underlying mechanism (.itera-flip* in
// src/index.css — a namespaced duplicate of production's .flip rules):
//   - content-driven height: both faces share one grid cell (grid-area: 1/1),
//     so the container sizes to the taller face with no JS measuring.
//   - backface-visibility: hidden, so only the front face is present while
//     flipped (and vice versa) — verified in the CSS, not reimplemented here.
//   - reduced motion: the transition is stripped entirely under
//     prefers-reduced-motion (CSS media query), and `flipped` drives the
//     class synchronously — no state change ever waits on animation
//     completion, with or without reduced motion.
//   - no fixed aspect ratio, no overflow:hidden anywhere in this chain, so
//     tall Markdown/code content grows the card instead of being clipped.
// Added here: role="button", tabIndex, Enter/Space activation, a
// focus-visible ring, aria-pressed, and aria-hidden on whichever face is
// currently the "back" of the card so assistive tech doesn't see both faces'
// text at once.
export function FlipCard({
  front,
  back,
  flipped,
  faceClassName,
  onFlip,
  ariaLabel,
}: {
  front: ReactNode
  back: ReactNode
  flipped: boolean
  faceClassName?: string
  onFlip: () => void
  ariaLabel: string
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onFlip()
    }
  }

  return (
    <div className={cn('itera-flip', flipped && 'is-flipped')}>
      <div
        role="button"
        tabIndex={flipped ? -1 : 0}
        aria-pressed={flipped}
        aria-hidden={flipped}
        aria-label={ariaLabel}
        onClick={flipped ? undefined : onFlip}
        onKeyDown={flipped ? undefined : onKeyDown}
        className={cn(
          'itera-flip-face itera-flip-front outline-none focus-visible:ring-2 focus-visible:ring-itera-accent focus-visible:ring-offset-2',
          !flipped && 'cursor-pointer',
          faceClassName,
        )}
      >
        {front}
      </div>
      <div
        aria-hidden={!flipped}
        className={cn('itera-flip-face itera-flip-back', faceClassName)}
      >
        {back}
      </div>
    </div>
  )
}
