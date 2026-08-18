import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { walkthroughFormToPreviewCard, type WalkthroughFormState } from '@/domain/cards/walkthroughForm'
import type { WalkthroughStepAnswer } from '@/domain/grading/walkthrough'
import type { WalkthroughInteraction } from '@/types/card'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import type { WalkthroughState } from '@/features/reviewV2/interactions/walkthrough/state'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// Seeds every step before `index` as already answered with a neutral
// placeholder (author-inspection only — no objective result is attached, so
// no per-step feedback banner appears on the seeded steps), so jumping to
// step N doesn't require actually completing steps 1..N-1 first.
function seedResponseForStep(interaction: WalkthroughInteraction, index: number): WalkthroughState {
  const answers: Record<string, WalkthroughStepAnswer> = {}
  for (let i = 0; i < index; i++) {
    const step = interaction.steps[i]
    if (!step) continue
    answers[step.id] =
      step.response.type === 'recall'
        ? { type: 'recall', revealed: true }
        : step.response.type === 'multiple_choice'
          ? { type: 'multiple_choice', selected: [] }
          : { type: 'exact_input', value: '' }
  }
  return { stepIndex: index, answers, results: {} }
}

// The editor's live preview: the *actual* production Walkthrough interaction
// component, not a fake mockup — same ReviewSessionScreen + registry Review
// uses. Non-committing: schedulingBefore is always a fresh baseline and
// onExit is a no-op.
//
// Adds two controls no single-screen type's preview needed: "Step N" buttons
// remount the screen with `initialResponse` (a new, additive
// ReviewSessionScreen prop — see its own comment) seeded so earlier steps
// read as already answered, landing fresh on the chosen step for inspection;
// "Reset preview" remounts with no seed at all — both the full reset and the
// "return from final feedback to the initial state" the brief asks for.
export function WalkthroughLivePreview({ form }: { form: WalkthroughFormState }) {
  const [resetKey, setResetKey] = useState(0)
  const [jumpStep, setJumpStep] = useState<number | null>(null)
  const card = walkthroughFormToPreviewCard(form, 'preview')

  function reset() {
    setJumpStep(null)
    setResetKey((k) => k + 1)
  }

  function jumpTo(index: number) {
    setJumpStep(index)
    setResetKey((k) => k + 1)
  }

  const initialResponse =
    jumpStep !== null ? seedResponseForStep(card.interaction, jumpStep) : undefined

  return (
    <IteraSurface>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {card.interaction.steps.map((step, i) => (
            <button
              key={step.id}
              type="button"
              onClick={() => jumpTo(i)}
              className={cn(
                'rounded-itera-control border px-2.5 py-1 text-xs font-medium transition-colors',
                jumpStep === i
                  ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                  : 'border-itera-border text-itera-muted hover:text-itera-ink',
              )}
            >
              Step {i + 1}
            </button>
          ))}
        </div>
        <Button type="button" variant="ghost" onClick={reset}>
          Reset preview
        </Button>
      </div>
      <ReviewSessionScreen
        key={resetKey}
        card={card}
        definition={getInteractionDefinition('walkthrough')}
        current={1}
        total={1}
        onExit={() => {}}
        schedulingBefore={initialSchedulingState()}
        initialResponse={initialResponse}
        hideTopBar
        hideRating
      />
    </IteraSurface>
  )
}
