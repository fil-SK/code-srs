import { useState } from 'react'
import type { CardInteraction, Card, InteractionType } from '@/types/card'
import type { InteractionDefinition, InteractionResponse } from '@/features/reviewV2/interactions/types'
import type { ReviewPhase } from '@/features/reviewV2/reviewPhase'
import { TipPanel } from '@/features/reviewV2/components/TipPanel'
import { ExplanationPanel } from '@/features/reviewV2/components/ExplanationPanel'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { cn } from '@/lib/cn'

// A deliberately simpler stand-in for ReviewSessionScreen, used only by the
// card editor's live preview (Recall/Multiple Choice/Write Code/Ordering/
// Matching — Walkthrough keeps its own ReviewSessionScreen-based step-jump
// preview, since it doesn't fit a plain front/back model). Product feedback
// on the original preview (which rendered the real ReviewSessionScreen
// as-is) was that "Exit session"/the "N of N" counter/the keyboard-shortcut
// hint/the interactive types' own "Submit answer" button are all Review-
// session mechanics that don't belong in an authoring preview — "the only
// thing that should be shown is the flashcard itself... a toggleable
// question/answer" (see docs/itera-decisions.md). So this renders the real
// `definition.View` (same fidelity D71 established matters), but drives its
// `phase` from one local boolean instead of ReviewSessionScreen's full
// reducer/grading/rating machinery, and hides each interactive view's own
// action button via `hideActions` (only this preview sets it — real Review
// never does).
export function InteractionAnswerPreview<T extends InteractionType>({
  card,
  definition,
}: {
  card: Card & { interaction: Extract<CardInteraction, { type: T }> }
  definition: InteractionDefinition<T>
}) {
  const [revealed, setRevealed] = useState(false)
  const [response, setResponse] = useState<InteractionResponse>(undefined)
  const phase: ReviewPhase = revealed ? { kind: 'feedback', result: null } : { kind: 'presenting' }
  const View = definition.View

  return (
    <IteraSurface>
      <div className="mb-3 flex gap-1 rounded-itera-control border border-itera-border p-1">
        {([false, true] as const).map((value) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setRevealed(value)}
            className={cn(
              'flex-1 rounded-[7px] py-1.5 text-sm font-semibold transition-colors',
              revealed === value ? 'bg-itera-accent-soft text-itera-ink-brand' : 'text-itera-muted',
            )}
          >
            {value ? 'Answer' : 'Question'}
          </button>
        ))}
      </div>

      <View
        card={card}
        phase={phase}
        response={response}
        setResponse={setResponse}
        onPrimaryAction={() => setRevealed((v) => !v)}
        responseReady
        hideActions
      />

      {phase.kind === 'presenting' && <TipPanel text={card.tip?.value} />}
      {phase.kind !== 'presenting' && <ExplanationPanel text={card.explanation?.value} />}
    </IteraSurface>
  )
}
