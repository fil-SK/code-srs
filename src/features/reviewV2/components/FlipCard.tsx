import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/cn'

// Itera's flip primitive, and now the only one. It replaced an earlier shared
// FlipCard whose front face was a plain <div onClick> with no tabIndex, role,
// or keyboard handler, so it failed keyboard activation and accessible
// semantics; rather than edit that file in place, this was written as a
// separate accessible replacement, and the original has since been deleted.
// The underlying mechanism is .itera-flip* in src/index.css:
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
//
// By default both faces are click/keyboard-activatable to flip (front -> back
// and back -> front), so the card itself is the thing you click rather than
// needing a separate "show question" control once flipped. Interactions such
// as Ordering can opt out when the surface surrounds pointer-heavy controls.
// Four of the six interaction types now put real controls (buttons, a code
// editor, option rows) inside the front face, so a click or Enter/Space
// originating on one of those must NOT also bubble up and re-trigger the
// face's own flip handler. `isOwnActivation` tells the two apart: it walks
// up from the actual event target looking for the nearest interactive
// element (same selector the Review shell's own isInteractiveTarget guard
// uses); if that nearest interactive element is the face itself, the click
// landed on plain content (prose, padding) and should flip the card. If it's
// something nested and closer (a button, an option row, the code editor),
// that control already handled the event itself and the face must not also
// react to it.
const INTERACTIVE_SELECTOR =
  'button, [role="button"], [role="radio"], [role="checkbox"], input, textarea, select, [contenteditable="true"], .cm-editor'

function isOwnActivation(target: EventTarget | null, face: HTMLElement): boolean {
  if (!(target instanceof HTMLElement)) return true
  const nearest = target.closest(INTERACTIVE_SELECTOR)
  return nearest === null || nearest === face
}

export function FlipCard({
  front,
  back,
  flipped,
  faceClassName,
  onFlip,
  activateOnSurface = true,
  ariaLabel,
}: {
  front: ReactNode
  back: ReactNode
  flipped: boolean
  faceClassName?: string
  onFlip: () => void
  activateOnSurface?: boolean
  ariaLabel: string
}) {
  function onFaceClick(e: MouseEvent<HTMLDivElement>) {
    if (!isOwnActivation(e.target, e.currentTarget)) return
    onFlip()
  }

  function onFaceKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!isOwnActivation(e.target, e.currentTarget)) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onFlip()
    }
  }

  return (
    <div className={cn('itera-flip', flipped && 'is-flipped')}>
      <div
        role={activateOnSurface ? 'button' : undefined}
        tabIndex={activateOnSurface ? (flipped ? -1 : 0) : undefined}
        aria-pressed={activateOnSurface ? flipped : undefined}
        aria-hidden={flipped}
        aria-label={activateOnSurface ? ariaLabel : undefined}
        onClick={activateOnSurface ? onFaceClick : undefined}
        onKeyDown={activateOnSurface ? onFaceKeyDown : undefined}
        className={cn(
          'itera-flip-face itera-flip-front',
          activateOnSurface &&
            'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-itera-accent focus-visible:ring-offset-2',
          faceClassName,
        )}
      >
        {front}
      </div>
      <div
        role={activateOnSurface ? 'button' : undefined}
        tabIndex={activateOnSurface ? (flipped ? 0 : -1) : undefined}
        aria-pressed={activateOnSurface ? flipped : undefined}
        aria-hidden={!flipped}
        aria-label={activateOnSurface ? ariaLabel : undefined}
        onClick={activateOnSurface ? onFaceClick : undefined}
        onKeyDown={activateOnSurface ? onFaceKeyDown : undefined}
        className={cn(
          'itera-flip-face itera-flip-back',
          activateOnSurface &&
            'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-itera-accent focus-visible:ring-offset-2',
          faceClassName,
        )}
      >
        {back}
      </div>
    </div>
  )
}
