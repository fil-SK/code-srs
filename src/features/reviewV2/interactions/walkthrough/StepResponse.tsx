import { useState } from 'react'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import type { ObjectiveResult } from '@/features/reviewV2/reviewPhase'
import type { McOption } from '@/types/cardV2'
import type { WalkthroughStep } from '@/types/cardV2'
import type { WalkthroughStepAnswer } from '@/domain/grading/walkthrough'

function ResultNote({ result }: { result: ObjectiveResult | null | undefined }) {
  if (!result) return null
  return (
    <div
      className={cn(
        'mt-3 text-xs font-semibold',
        result.correct ? 'text-itera-success' : 'text-itera-error',
      )}
    >
      {result.correct ? 'Correct' : 'Incorrect'}
    </div>
  )
}

function StepMultipleChoice({
  options,
  selectionMode,
  selected,
  readOnly,
  result,
  onSubmit,
}: {
  options: McOption[]
  selectionMode: 'single' | 'multiple'
  selected: string[]
  readOnly: boolean
  result: ObjectiveResult | null | undefined
  onSubmit: (selected: string[]) => void
}) {
  const [choice, setChoice] = useState<string[]>(selected)

  function toggle(id: string) {
    if (readOnly) return
    if (selectionMode === 'multiple') {
      setChoice(choice.includes(id) ? choice.filter((x) => x !== id) : [...choice, id])
    } else {
      setChoice(choice.includes(id) ? [] : [id])
    }
  }

  return (
    <div>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const isSelected = choice.includes(opt.id)
          return (
            <div
              key={opt.id}
              role={selectionMode === 'multiple' ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              aria-disabled={readOnly}
              tabIndex={readOnly ? -1 : 0}
              onClick={() => toggle(opt.id)}
              onKeyDown={(e) => {
                if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  toggle(opt.id)
                }
              }}
              className={cn(
                'cursor-pointer rounded-itera-control border px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-itera-accent',
                readOnly && 'cursor-default',
                isSelected
                  ? 'border-itera-accent bg-itera-accent-soft'
                  : 'border-itera-border bg-itera-surface hover:border-itera-border-strong',
              )}
            >
              <InlineText text={opt.content.value} />
            </div>
          )
        })}
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onSubmit(choice)}
          disabled={choice.length === 0}
          className="mt-3 rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
        >
          Submit
        </button>
      )}
      {readOnly && <ResultNote result={result} />}
    </div>
  )
}

function StepExactInput({
  initialValue,
  readOnly,
  result,
  onSubmit,
}: {
  initialValue: string
  readOnly: boolean
  result: ObjectiveResult | null | undefined
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  return (
    <div>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (!readOnly && e.key === 'Enter' && value.trim()) {
            e.preventDefault()
            onSubmit(value)
          }
        }}
        placeholder="Type your answer"
        className="w-full rounded-itera-control border border-itera-border bg-itera-surface px-3 py-2 text-sm text-itera-ink outline-none focus-visible:ring-2 focus-visible:ring-itera-accent"
      />
      {!readOnly && (
        <button
          type="button"
          onClick={() => onSubmit(value)}
          disabled={!value.trim()}
          className="mt-3 rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
        >
          Submit
        </button>
      )}
      {readOnly && <ResultNote result={result} />}
    </div>
  )
}

// One component per step response type, dispatched by the parent
// (WalkthroughView) - mirrors the top-level interaction registry's "one
// renderer per type" philosophy at step granularity. Mounted with key={step.id}
// by the caller, so each step gets fresh local state (the pre-submit choice/
// input draft) rather than needing to reset it manually on navigation.
export function StepResponse({
  step,
  answer,
  result,
  readOnly,
  onSubmit,
}: {
  step: WalkthroughStep
  answer: WalkthroughStepAnswer | undefined
  result: ObjectiveResult | null | undefined
  readOnly: boolean
  onSubmit: (answer: WalkthroughStepAnswer) => void
}) {
  if (step.response.type === 'recall') {
    const revealed = readOnly || answer?.type === 'recall'
    return (
      <div>
        {revealed && (
          <RichText
            text={step.response.answer.value}
            className="text-sm leading-relaxed text-itera-ink"
          />
        )}
        {!revealed && (
          <button
            type="button"
            onClick={() => onSubmit({ type: 'recall', revealed: true })}
            className="rounded-itera-control border border-itera-border bg-itera-surface px-3.5 py-2 text-sm font-medium text-itera-ink transition-colors hover:border-itera-accent"
          >
            Reveal answer
          </button>
        )}
      </div>
    )
  }

  if (step.response.type === 'multiple_choice') {
    const selected = answer?.type === 'multiple_choice' ? answer.selected : []
    return (
      <StepMultipleChoice
        options={step.response.options}
        selectionMode={step.response.selectionMode}
        selected={selected}
        readOnly={readOnly}
        result={result}
        onSubmit={(sel) => onSubmit({ type: 'multiple_choice', selected: sel })}
      />
    )
  }

  const value = answer?.type === 'exact_input' ? answer.value : ''
  return (
    <StepExactInput
      initialValue={value}
      readOnly={readOnly}
      result={result}
      onSubmit={(v) => onSubmit({ type: 'exact_input', value: v })}
    />
  )
}
