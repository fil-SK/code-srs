import { useEffect, useReducer, useState } from 'react'
import type { Rating, SchedulingState } from '@/types'
import type { CardInteraction, CardV2, InteractionType } from '@/types/cardV2'
import { reviewService, type SubmitReviewResult } from '@/domain/scheduling/reviewService'
import { ReviewTopBar } from './components/ReviewTopBar'
import { TipPanel } from './components/TipPanel'
import { ExplanationPanel } from './components/ExplanationPanel'
import { RatingControls } from './components/RatingControls'
import { initialReviewPhase, reviewPhaseReducer } from './reviewPhase'
import type { InteractionDefinition, InteractionResponse } from './interactions/types'

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'button, [role="button"], [role="radio"], [role="checkbox"], input, textarea, select, [contenteditable="true"], .cm-editor',
      ),
    )
  )
}

// The shared Review shell (spec §15, §30.3): owns layout, Tip/Explanation/
// rating placement, the phase state machine, and all keyboard coordination —
// no interaction type implements any of this itself. Deliberately free of
// global navigation, sidebar, logo, deck metadata, tags, a due queue, or
// stats; see the module doc in reviewPhase.ts for the state machine itself.
//
// Callers reset per-card state by remounting with `key={card.id}` — simpler
// and more robust than manually resetting phase/response/timing on every
// field that needs it.
export function ReviewSessionScreen<T extends InteractionType>({
  card,
  definition,
  current,
  total,
  onExit,
  schedulingBefore,
  onGraded,
  initialResponse,
  hideTopBar,
  hideRating,
}: {
  card: CardV2 & { interaction: Extract<CardInteraction, { type: T }> }
  definition: InteractionDefinition<T>
  current: number
  total: number
  onExit: () => void
  // No CardV2 repository exists yet (see reviewService.ts) — callers supply
  // whatever SchedulingState they have; the preview routes pass a fresh
  // baseline since there is nothing real to persist against yet.
  schedulingBefore: SchedulingState
  onGraded?: (result: SubmitReviewResult) => void
  // Purely additive, optional seed for `response`'s initial value. Every
  // existing caller omits it (identical behavior to before). Added so a
  // multi-step type's editor preview (Walkthrough) can jump straight into an
  // arbitrary authored step for inspection — the first interaction type with
  // in-place multi-screen navigation, so no prior type ever needed to seed a
  // non-empty starting response. Callers still reset via `key={...}`, not by
  // changing this prop after mount.
  initialResponse?: InteractionResponse
  // Optional, both default false — every existing caller (real Review,
  // /design-preview/review/*) omits them and is unaffected. Set by
  // WalkthroughLivePreview only, whose step-jump authoring preview still
  // needs this shell's real phase/grading machinery (unlike the other five
  // types' simplified InteractionAnswerPreview) but not its session-only
  // chrome — see docs/itera-decisions.md.
  hideTopBar?: boolean
  hideRating?: boolean
}) {
  const [phase, dispatch] = useReducer(reviewPhaseReducer, initialReviewPhase)
  const [response, setResponse] = useState<InteractionResponse>(initialResponse)
  const [presentedAt] = useState(() => Date.now())
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)

  const responseReady = definition.interactive
    ? (definition.isResponseReady?.(response, card.interaction) ?? true)
    : true

  const suggested: Rating | null =
    phase.kind === 'feedback' && phase.result
      ? phase.result.correct
        ? 3
        : (phase.result.score ?? 0) > 0
          ? 2 // partially correct (Matching/Walkthrough) - a quieter hint than a flat "Again"
          : 1
      : null

  function primaryAction() {
    if (phase.kind !== 'presenting') return
    if (!definition.interactive) {
      dispatch({ type: 'REVEAL' })
      return
    }
    if (!responseReady) return
    dispatch({ type: 'SUBMIT_RESPONSE' })
    // A genuine `null` (nothing objective to grade - e.g. an all-Recall
    // Walkthrough) is distinct from `{correct:false}` (graded and wrong) and
    // must survive as-is: coercing it to {correct:false} would show
    // "Incorrect" and suggest the Again rating for content that was never
    // objectively checked. Only `autoGrade` being absent falls back to null.
    const result = definition.autoGrade ? definition.autoGrade(card.interaction, response) : null
    dispatch({ type: 'RESPONSE_VALIDATED', result })
  }

  async function rate(rating: Rating) {
    if (phase.kind !== 'feedback') return
    setSelectedRating(rating)
    dispatch({ type: 'CHOOSE_RATING' })
    const autoGraded = phase.result != null && suggested === rating
    const result = await reviewService.submit({
      cardId: card.id,
      before: schedulingBefore,
      rating,
      autoGraded,
      durationMs: Date.now() - presentedAt,
    })
    dispatch({ type: 'GRADED' })
    onGraded?.(result)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return
      const interactiveTarget = isInteractiveTarget(e.target)

      if (e.key === 'Escape') {
        onExit()
        return
      }

      if ((e.key === ' ' || e.code === 'Space') && !interactiveTarget) {
        e.preventDefault() // never let Space scroll the page mid-review
        if (!definition.interactive) primaryAction()
        return
      }

      if (e.key === 'Enter' && !interactiveTarget) {
        if (definition.interactive) primaryAction()
        return
      }

      if (
        phase.kind === 'feedback' &&
        !hideRating &&
        !interactiveTarget &&
        ['1', '2', '3', '4'].includes(e.key)
      ) {
        rate(Number(e.key) as Rating)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, response, definition])

  const shortcutHint = !definition.interactive
    ? phase.kind === 'presenting'
      ? 'Space to reveal'
      : phase.kind === 'feedback'
        ? '1–4 to rate'
        : ''
    : phase.kind === 'presenting'
      ? responseReady
        ? 'Enter to submit'
        : 'Select an answer'
      : phase.kind === 'feedback'
        ? '1–4 to rate'
        : ''

  const showExplanation = phase.kind !== 'presenting' && phase.kind !== 'submitting'
  const showRating = phase.kind !== 'presenting' && phase.kind !== 'submitting'

  return (
    <div>
      {!hideTopBar && (
        <ReviewTopBar
          current={current}
          total={total}
          onExit={onExit}
          shortcutHint={shortcutHint}
        />
      )}

      <definition.View
        card={card}
        phase={phase}
        response={response}
        setResponse={setResponse}
        onPrimaryAction={primaryAction}
        responseReady={responseReady}
      />

      {phase.kind === 'presenting' && <TipPanel text={card.tip?.value} />}

      {showExplanation && <ExplanationPanel text={card.explanation?.value} />}

      {showRating && !hideRating && (
        <RatingControls
          selected={selectedRating}
          suggested={suggested}
          disabled={phase.kind !== 'feedback'}
          onRate={rate}
          note={
            phase.kind === 'transitioning'
              ? 'Preview only — nothing recorded.'
              : undefined
          }
        />
      )}
    </div>
  )
}
