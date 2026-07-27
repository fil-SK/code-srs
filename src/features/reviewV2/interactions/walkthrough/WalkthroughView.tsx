import { useEffect, useRef } from 'react'
import { RichText } from '@/components/text/RichText'
import { LazyCodeView } from '@/components/code/LazyCodeView'
import { cn } from '@/lib/cn'
import { gradeWalkthroughStep } from '@/domain/grading/walkthrough'
import { CardPanel } from '../../components/CardPanel'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'
import { initialWalkthroughState, type WalkthroughState } from './state'
import { focusToHighlightLines } from './focusLines'
import { StepResponse } from './StepResponse'

// One Card, multiple ordered steps, one final CardState/rating (spec): every
// step is answered inside this View while the shell's phase stays
// 'presenting' - only the last step's Continue button (relabeled "Finish")
// calls the shell's onPrimaryAction, which is what actually submits the
// whole card and reveals the Explanation/rating. See index.ts's
// isResponseReady, which mirrors "every step answered" exactly so an early
// Enter press (shell-level) can't finish the card before that.
export function WalkthroughView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
}: InteractionViewProps<'walkthrough'>) {
  const { interaction } = card
  const state = (response as WalkthroughState | undefined) ?? initialWalkthroughState
  const locked = phase.kind !== 'presenting'
  const step = interaction.steps[state.stepIndex]
  const stepAnswered = step ? step.id in state.answers : false
  const isLastStep = state.stepIndex === interaction.steps.length - 1
  const allAnswered = interaction.steps.every((s) => s.id in state.answers)
  const stepPanelRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (response === undefined) setResponse(initialWalkthroughState)
    // Mount-only seed, same convention as Ordering/Write Code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Walkthrough is the first interaction type with in-place multi-screen
  // navigation (every other type is single-screen), so nothing else in
  // reviewV2 needed to move focus on an internal transition. Skips the
  // initial mount (no prior type auto-focuses anything on first render) and
  // only fires on a genuine step change, landing focus on the new step's
  // panel so screen-reader users get the new prompt/highlight context
  // instead of stale focus on the Previous/Continue button.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    stepPanelRef.current?.focus()
  }, [state.stepIndex])

  function submitStep(stepId: string, answer: Parameters<typeof gradeWalkthroughStep>[1]) {
    if (locked || stepId in state.answers) return // first submission wins
    const stepDef = interaction.steps.find((s) => s.id === stepId)
    if (!stepDef) return
    const result = gradeWalkthroughStep(stepDef, answer)
    setResponse({
      ...state,
      answers: { ...state.answers, [stepId]: answer },
      results: { ...state.results, [stepId]: result },
    } satisfies WalkthroughState)
  }

  function goTo(index: number) {
    if (index < 0 || index >= interaction.steps.length) return
    setResponse({ ...state, stepIndex: index })
  }

  function continueOrFinish() {
    if (isLastStep) onPrimaryAction()
    else goTo(state.stepIndex + 1)
  }

  const highlightLines = focusToHighlightLines(step?.focus)

  return (
    <CardPanel>
      <div className="flex flex-col items-center gap-1 text-center">
        <InteractionLabel type="walkthrough" />
        <RichText
          text={card.prompt.value}
          className="mt-2 text-2xl font-bold leading-snug text-itera-ink-brand"
        />
      </div>
      <RichText
        text={interaction.scenario.value}
        className="mt-3 text-center text-sm leading-relaxed text-itera-ink"
      />

      {interaction.code && (
        <div className="mt-3">
          <LazyCodeView
            code={interaction.code.value}
            language={interaction.code.language}
            highlightLines={highlightLines}
          />
        </div>
      )}
      {interaction.image && (
        <img
          src={interaction.image}
          alt=""
          className="mt-3 max-w-full rounded-itera-control border border-itera-border"
        />
      )}

      <div className="mt-5 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-itera-muted">
          Step {state.stepIndex + 1} of {interaction.steps.length}
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {interaction.steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                'h-1.5 w-5 rounded-full',
                i === state.stepIndex
                  ? 'bg-itera-accent'
                  : s.id in state.answers
                    ? 'bg-itera-success/60'
                    : 'bg-itera-border',
              )}
            />
          ))}
        </div>
      </div>

      {step && (
        <div
          ref={stepPanelRef}
          tabIndex={-1}
          className="mt-3 rounded-itera-control border border-itera-border bg-itera-surface p-4 outline-none focus-visible:ring-2 focus-visible:ring-itera-accent"
        >
          <RichText
            text={step.prompt.value}
            className="text-sm font-semibold leading-snug text-itera-ink-brand"
          />
          <div className="mt-3">
            <StepResponse
              key={step.id}
              step={step}
              answer={state.answers[step.id]}
              result={state.results[step.id]}
              readOnly={locked || stepAnswered}
              onSubmit={(answer) => submitStep(step.id, answer)}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goTo(state.stepIndex - 1)}
          disabled={state.stepIndex === 0}
          className="rounded-itera-control px-3 py-2 text-sm font-medium text-itera-muted transition-colors hover:text-itera-ink disabled:pointer-events-none disabled:opacity-30"
        >
          Previous
        </button>
        {stepAnswered && !locked && (
          <button
            type="button"
            onClick={continueOrFinish}
            disabled={isLastStep && !allAnswered}
            className="rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
          >
            {isLastStep ? 'Finish' : 'Continue'}
          </button>
        )}
      </div>
    </CardPanel>
  )
}
