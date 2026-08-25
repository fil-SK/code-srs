import {
  formatInterval,
  iteraColors,
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
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
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

export function ReviewSessionScreen<T extends InteractionType>({
  card,
  definition,
  current,
  total,
  schedulingBefore,
  onExit,
  onGraded,
}: {
  card: Card & { interaction: Extract<CardInteraction, { type: T }> }
  definition: NativeInteractionDefinition<T>
  current: number
  total: number
  // The card's real current scheduling. Passed in rather than read off the card
  // so the caller decides what "before" means - the session snapshots it at
  // mount, so a re-render after the workspace updates cannot regrade against
  // the card's new state.
  schedulingBefore: SchedulingState
  onExit: () => void
  // Records the computed result and advances. Awaited so a future cloud session
  // can reject here and add its own failure phase; a demo write is synchronous
  // and cannot fail, which is why this screen has no retry state.
  onGraded: (result: SubmitReviewResult) => Promise<void> | void
}) {
  const [phase, dispatch] = useReducer(reviewPhaseReducer, initialReviewPhase)
  const [response, setResponse] = useState<InteractionResponse>(undefined)
  const [presentedAt] = useState(() => Date.now())
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  // Ordering takes the vertical gesture while a row is held; everything else
  // leaves this alone.
  const [scrollEnabled, setScrollEnabled] = useState(true)

  // Real next-due intervals per rating, from this card's own scheduling. Every
  // preview screen used to show the same four hard-coded strings.
  const ratingIntervals = useMemo(() => {
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
    if (phase.kind !== 'feedback') return
    setSelectedRating(rating)
    // Dispatched synchronously before the await, so the reducer's source-state
    // guard makes a second press - or a press of another rating - a no-op.
    dispatch({ type: 'GRADED' })

    const autoGraded = phase.result != null && suggested === rating
    const result = await reviewService.submit({
      cardId: card.id,
      before: schedulingBefore,
      rating,
      autoGraded,
      durationMs: Date.now() - presentedAt,
    })
    await onGraded(result)
  }

  const revealed = phase.kind === 'feedback' || phase.kind === 'transitioning'

  const hint = revealed
    ? 'Rate your answer'
    : definition.interactive
      ? responseReady
        ? 'Submit to check'
        : 'Answer to continue'
      : 'Tap to flip'

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ReviewSessionHeader
        current={current}
        exitLabel="Exit review session"
        hint={hint}
        hintIcon={revealed ? 'check-decagram-outline' : definition.interactive ? 'gesture-tap-button' : 'gesture-tap'}
        onExit={onExit}
        total={total}
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

          {revealed && (
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  keyboardView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
})
