import type { ReactNode } from 'react'
import { FlipCard } from './FlipCard'

// The Itera Recall card face: a literal flashcard that flips between front
// and back. Built on this package's own, keyboard-accessible FlipCard (not
// the shared production primitive — see that file for why) so the flip
// mechanics, height-matching, and reduced-motion handling are inherited, not
// reimplemented. Only the face styling here is Recall/card-specific.
export function FlashcardSurface({
  flipped,
  onFlip,
  front,
  back,
  ariaLabel,
}: {
  flipped: boolean
  onFlip: () => void
  front: ReactNode
  back: ReactNode
  ariaLabel: string
}) {
  return (
    <FlipCard
      flipped={flipped}
      onFlip={onFlip}
      front={front}
      back={back}
      ariaLabel={ariaLabel}
      faceClassName="flex min-h-[22rem] flex-col justify-between rounded-itera-card border border-itera-border bg-itera-surface p-8 shadow-[var(--itera-shadow-card)]"
    />
  )
}
