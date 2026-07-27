import type { ReactNode } from 'react'

// Static (non-flipping) counterpart to FlashcardSurface's own face styling —
// gives every interactive interaction type (Multiple Choice, Matching,
// Ordering, Walkthrough, Write Code) the same card-shaped surface Recall
// gets for free from FlipCard, so all six types read as "a flashcard" rather
// than only Recall. Same border/rounding/background/shadow, no flip.
export function CardPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-8 shadow-[var(--itera-shadow-card)]">
      {children}
    </div>
  )
}
