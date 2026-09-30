import type { ReactNode } from 'react'
import { FlipCard } from './FlipCard'

// The FlipTap Recall card face: a literal flashcard that flips between front
// and back. Built on this package's own, keyboard-accessible FlipCard (not
// the shared production primitive — see that file for why) so the flip
// mechanics, height-matching, and reduced-motion handling are inherited, not
// reimplemented. Only the face styling here is Recall/card-specific.
export function FlashcardSurface({
  flipped,
  onFlip,
  activateOnSurface = true,
  front,
  back,
  ariaLabel,
}: {
  flipped: boolean
  onFlip: () => void
  activateOnSurface?: boolean
  front: ReactNode
  back: ReactNode
  ariaLabel: string
}) {
  return (
    <FlipCard
      flipped={flipped}
      onFlip={onFlip}
      activateOnSurface={activateOnSurface}
      front={front}
      back={back}
      ariaLabel={ariaLabel}
      faceClassName="flex min-h-[22rem] flex-col justify-between rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-8 shadow-[var(--fliptap-shadow-card)]"
    />
  )
}
