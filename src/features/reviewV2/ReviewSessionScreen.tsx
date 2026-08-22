import { useEffect, useMemo, useReducer, useState } from 'react'
import type { Rating, SchedulingState } from '@/types'
import type { CardInteraction, Card, InteractionType } from '@/types/card'
import { cn } from '@/lib/cn'
import { reviewService, type SubmitReviewResult } from '@/domain/scheduling/reviewService'
import { formatInterval } from '@/domain/scheduling/format'
import { ReviewTopBar } from './components/ReviewTopBar'
import { TipPanel } from './components/TipPanel'
import { ExplanationPanel } from './components/ExplanationPanel'
import { RatingControls } from './components/RatingControls'
import { ReviewPersistError } from './components/ReviewPersistError'
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

function hasWalkthroughCode(interaction: CardInteraction): boolean {
  return interaction.type === 'walkthrough' && Boolean(interaction.code)
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
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  persistErrorMessage = "We couldn't save this review. Try again.",
}: {
  card: Card & { interaction: Extract<CardInteraction, { type: T }> }
  definition: InteractionDefinition<T>
  current: number
  total: number
  onExit: () => void
  // The card's real, current scheduling in a production session. The preview
  // routes pass a fresh baseline instead, because they omit `onGraded` and
  // therefore persist nothing.
  schedulingBefore: SchedulingState
  // Persists the computed result. Awaited: a rejection is what puts this screen
  // into `persistFailed` rather than advancing the session, so a caller that
  // swallows its own errors will look like success here. Omitted by the preview
  // routes, which record nothing.
  onGraded?: (result: SubmitReviewResult) => Promise<void> | void
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
  // Deck flip-through adds navigation around the position in the shared
  // strip. Real review sessions omit it because their queue advances only
  // after grading.
  onPrevious?: () => void
  onNext?: () => void
  previousDisabled?: boolean
  nextDisabled?: boolean
  // Domain copy for a failed write, from describeReviewCommitFailure. The
  // default is only for callers that persist nothing and can never show it;
  // raw backend text must never be passed here.
  persistErrorMessage?: string
}) {
  const [phase, dispatch] = useReducer(reviewPhaseReducer, initialReviewPhase)
  const [response, setResponse] = useState<InteractionResponse>(initialResponse)
  const [presentedAt] = useState(() => Date.now())
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  // The one immutable result this card's grade produced. Kept so a failed write
  // can be retried by re-sending exactly this, rather than calling
  // reviewService.submit again - a second submit would recompute FSRS (from the
  // same `before`, but at a later `now`) and mint a second ReviewLog id, which
  // is how a retry turns into a second review.
  const [pendingResult, setPendingResult] = useState<SubmitReviewResult | null>(null)

  const ratingIntervals = useMemo(() => {
    const preview = reviewService.previewNextStates(schedulingBefore, presentedAt)
    return {
      1: formatInterval(presentedAt, preview[1].due),
      2: formatInterval(presentedAt, preview[2].due),
      3: formatInterval(presentedAt, preview[3].due),
      4: formatInterval(presentedAt, preview[4].due),
    } satisfies Record<Rating, string>
  }, [presentedAt, schedulingBefore])

  // Callers remount this whole component per card (key={card.id}), so a
  // mount-only entrance animation naturally replays for every new card
  // without any extra id-tracking - "drawing the next card off the deck"
  // instead of the old card blinking straight to the new one. Starts in the
  // CSS's rotated/offset/faded resting-off-stack pose and flips to `-active`
  // one frame later so the browser actually transitions between the two
  // states rather than starting already there.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

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

  // GRADED is dispatched only once the write actually committed. It used to fire
  // before persistence, with `onGraded` left un-awaited, so a rejection became an
  // unhandled promise rejection while the session sat in `transitioning` with the
  // ratings disabled and nothing to tell the learner (audit §10 item 5).
  async function persist(result: SubmitReviewResult) {
    try {
      await onGraded?.(result)
      dispatch({ type: 'GRADED' })
    } catch {
      // The reason is deliberately dropped here: the caller owns both the
      // user-facing copy and any logging, and backend error text must not reach
      // the screen.
      dispatch({ type: 'PERSIST_FAILED' })
    }
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
    setPendingResult(result)
    await persist(result)
  }

  async function retryPersist() {
    if (phase.kind !== 'persistFailed' || !pendingResult) return
    // Dispatched synchronously before the await, exactly as rate() does, so the
    // reducer's source-state guard makes a second click a no-op.
    dispatch({ type: 'RETRY_PERSIST' })
    await persist(pendingResult)
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

  const feedbackHint: { key?: string; label: string } = hideRating
    ? { label: 'Answer revealed' }
    : { label: 'Rate your answer' }
  const shortcut: { key?: string; label: string } = !definition.interactive
    ? phase.kind === 'presenting'
      ? { key: 'Space', label: 'to flip' }
      : phase.kind === 'feedback'
        ? feedbackHint
        : { label: '' }
    : phase.kind === 'presenting'
      ? responseReady
        ? { key: 'Enter', label: 'to submit' }
        : { label: 'Select an answer' }
      : phase.kind === 'feedback'
        ? feedbackHint
        : { label: '' }

  const showExplanation = phase.kind !== 'presenting' && phase.kind !== 'submitting'
  const showRating = phase.kind !== 'presenting' && phase.kind !== 'submitting'

  return (
    <div className={cn(!hideTopBar && 'pb-14')}>
      {!hideTopBar && (
        <ReviewTopBar
          current={current}
          total={total}
          onExit={onExit}
          shortcutKey={shortcut.key}
          shortcutLabel={shortcut.label}
          onPrevious={onPrevious}
          onNext={onNext}
          previousDisabled={previousDisabled}
          nextDisabled={nextDisabled}
        />
      )}

      {/* The flashcard itself reads best at the same width as the card
          editor's own column (CardEditorShell's EDITOR_COL, 42rem/max-w-2xl)
          - noticeably narrower than the full session width the top bar
          uses, matching the reference mockups (top bar spans edge to edge,
          the card is a centered, narrower column below it). A type may ask
          for the wider column when its own content genuinely needs it (only
          Matching does, and only for a three-column board, where 42rem
          leaves each column too narrow to hold a line of text). */}
      <div
        className={cn(
          'itera-card-enter mx-auto',
          hasWalkthroughCode(card.interaction) && 'itera-card-enter-crisp-code',
          definition.widthFor?.(card.interaction) === 'wide' ? 'max-w-4xl' : 'max-w-2xl',
          entered && 'itera-card-enter-active',
        )}
      >
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
          <>
            <RatingControls
              selected={selectedRating}
              suggested={suggested}
              intervals={ratingIntervals}
              // Stays disabled through rating, persistFailed and transitioning:
              // once a grade is chosen its result is fixed, and a retry re-sends
              // that result rather than offering a fresh grade.
              disabled={phase.kind !== 'feedback'}
              onRate={rate}
              // Only for callers that persist nothing. This used to show during
              // `transitioning`, which in a real session is exactly the window
              // in which the grade is being recorded.
              note={
                onGraded == null && phase.kind === 'transitioning'
                  ? 'Preview only — nothing recorded.'
                  : undefined
              }
            />
            {phase.kind === 'persistFailed' && (
              <ReviewPersistError message={persistErrorMessage} onRetry={retryPersist} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
