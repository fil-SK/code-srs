import {
  formatInterval,
  iteraColors,
  iteraRadii,
  reviewService,
  type Card,
  type CardInteraction,
  type InteractionResponse,
  type InteractionType,
  type Rating,
  type SchedulingState,
  type SubmitReviewResult,
} from '@itera/core'
import { useMemo, useReducer, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { RatingControls } from './RatingControls'
import { ReviewSessionHeader } from './ReviewSessionHeader'
import { ExplanationPanel, TipPanel } from './TipPanel'
import type { NativeInteractionDefinition } from './interactions/types'
import { initialReviewPhase, reviewPhaseReducer } from './reviewPhase'

// The shared native Review shell.
//
// It owns the phase machine, the response, the timing, the FSRS interval
// preview, the objective-result-to-suggested-rating mapping and the grade
// hand-off. It contains no per-type logic: which View renders, when a response
// counts as ready, and what a submitted response scores all come from the
// shared behavior descriptor the caller binds.
//
// The web equivalent (apps/web/src/features/reviewV2/ReviewSessionScreen.tsx)
// is the semantic reference. What is shared between them is everything that
// decides an outcome; what differs is chrome, layout and input, which is the
// intended split.
//
// Per-card state resets by remounting: the session route keys this on card.id,
// the same rule web follows, which is simpler and more robust than resetting
// phase, response and timing field by field.
//
// Two modes, because the product has two ways of putting a card on screen and
// only one of them is a review:
//
//   'review' - a card inside a session. It has a position in a queue, a real
//              scheduling state to grade against, and a grade hand-off.
//   'study'  - one card inspected outside a session, the native equivalent of
//              web's cards/:id/study. Everything up to and including objective
//              feedback is identical, because that is what makes it a faithful
//              preview; there is no rating, no interval preview, no
//              reviewService.submit and no grade hand-off, because nothing is
//              recorded.
//
// The two are a discriminated union rather than a set of optional props on
// purpose: a study surface cannot be handed a grade handler by accident, and a
// session cannot forget one.

type ReviewSessionScreenProps<T extends InteractionType> = {
  card: Card & { interaction: Extract<CardInteraction, { type: T }> }
  definition: NativeInteractionDefinition<T>
  onExit: () => void
} & (
  | {
      mode?: 'review'
      current: number
      total: number
      // The card's real current scheduling. Passed in rather than read off the
      // card so the caller decides what "before" means - the session snapshots
      // it at mount, so a re-render after the workspace updates cannot regrade
      // against the card's new state.
      schedulingBefore: SchedulingState
      // Records the computed result and advances. Awaited so a future cloud
      // session can reject here and add its own failure phase; a demo write is
      // synchronous and cannot fail, which is why this screen has no retry
      // state.
      onGraded: (result: SubmitReviewResult) => Promise<void> | void
    }
  | { mode: 'study' }
)

export function ReviewSessionScreen<T extends InteractionType>(
  props: ReviewSessionScreenProps<T>,
) {
  const { card, definition, onExit } = props
  // Null in study mode. Everything a grade needs hangs off this one value, so
  // there is exactly one place that decides whether this card can be recorded.
  const review = props.mode === 'study' ? null : props

  const [phase, dispatch] = useReducer(reviewPhaseReducer, initialReviewPhase)
  const [response, setResponse] = useState<InteractionResponse>(undefined)
  const [presentedAt] = useState(() => Date.now())
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  // Ordering takes the vertical gesture while a row is held; everything else
  // leaves this alone.
  const [scrollEnabled, setScrollEnabled] = useState(true)

  // Real next-due intervals per rating, from this card's own scheduling. Every
  // preview screen used to show the same four hard-coded strings.
  //
  // Not computed in study mode: there is no rating there, so previewing what
  // each rating would schedule would describe an outcome that cannot happen.
  const schedulingBefore = review?.schedulingBefore
  const ratingIntervals = useMemo(() => {
    if (!schedulingBefore) return null
    const preview = reviewService.previewNextStates(schedulingBefore, presentedAt)
    return {
      1: formatInterval(presentedAt, preview[1].due),
      2: formatInterval(presentedAt, preview[2].due),
      3: formatInterval(presentedAt, preview[3].due),
      4: formatInterval(presentedAt, preview[4].due),
    } satisfies Record<Rating, string>
  }, [presentedAt, schedulingBefore])

  const responseReady = definition.interactive
    ? (definition.isResponseReady?.(response, card.interaction) ?? true)
    : true

  // A recommendation, not a decision. Same mapping as web: correct suggests
  // Good, partial credit suggests Hard - a quieter hint than a flat Again - and
  // nothing objectively right suggests Again. Null when there was nothing
  // objective to grade at all.
  const suggested: Rating | null =
    phase.kind === 'feedback' && phase.result
      ? phase.result.correct
        ? 3
        : (phase.result.score ?? 0) > 0
          ? 2
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
    // A genuine null - nothing objective to grade, as in an all-Recall
    // Walkthrough - is distinct from a graded-and-wrong result and must survive
    // as null. Coercing it would show "Incorrect" and suggest Again for content
    // that was never checked.
    const result = definition.autoGrade ? definition.autoGrade(card.interaction, response) : null
    dispatch({ type: 'RESPONSE_VALIDATED', result })
  }

  async function rate(rating: Rating) {
    if (!review) return
    if (phase.kind !== 'feedback') return
    setSelectedRating(rating)
    // Dispatched synchronously before the await, so the reducer's source-state
    // guard makes a second press - or a press of another rating - a no-op.
    dispatch({ type: 'GRADED' })

    const autoGraded = phase.result != null && suggested === rating
    const result = await reviewService.submit({
      cardId: card.id,
      before: review.schedulingBefore,
      rating,
      autoGraded,
      durationMs: Date.now() - presentedAt,
    })
    await review.onGraded(result)
  }

  const revealed = phase.kind === 'feedback' || phase.kind === 'transitioning'

  const hint = revealed
    ? review
      ? 'Rate your answer'
      : 'Nothing recorded'
    : definition.interactive
      ? responseReady
        ? 'Submit to check'
        : 'Answer to continue'
      : 'Tap to flip'

  const hintIcon = revealed
    ? review
      ? 'check-decagram-outline'
      : 'eye-outline'
    : definition.interactive
      ? 'gesture-tap-button'
      : 'gesture-tap'

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ReviewSessionHeader
        badge={review ? undefined : 'Preview'}
        exitLabel={review ? 'Exit review session' : 'Close card preview'}
        hint={hint}
        hintIcon={hintIcon}
        onExit={onExit}
        progress={review ? { current: review.current, total: review.total } : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
        >
          <definition.View
            card={card}
            onPrimaryAction={primaryAction}
            phase={phase}
            response={response}
            responseReady={responseReady}
            setResponse={setResponse}
            setScrollEnabled={setScrollEnabled}
          />

          {phase.kind === 'presenting' && <TipPanel tip={card.tip} />}
          {revealed && <ExplanationPanel explanation={card.explanation} />}

          {revealed && review && ratingIntervals && (
            <View>
              <RatingControls
                disabled={phase.kind !== 'feedback'}
                intervals={ratingIntervals}
                onRate={rate}
                selected={selectedRating}
                suggested={suggested}
              />
            </View>
          )}

          {/*
            Stated from the first frame rather than only after an answer: a
            learner decides how honestly to answer based on whether it counts,
            so saying so afterwards would be saying it too late.
          */}
          {!review && (
            <View style={styles.previewNotice}>
              <Text style={styles.previewNoticeText}>Preview only - nothing recorded.</Text>
              <Text style={styles.previewNoticeDetail}>
                Answering here changes no schedule and adds nothing to your review history.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  keyboardView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  previewNotice: {
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surfaceSubtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  previewNoticeText: { color: iteraColors.inkBrand, fontSize: 14, fontWeight: '700' },
  previewNoticeDetail: {
    marginTop: 4,
    color: iteraColors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
})
