import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import { gradeMultipleChoice } from '@/domain/grading/multipleChoice'
import { CardPanel } from '../../components/CardPanel'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'

export function MultipleChoiceView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
  responseReady,
  hideActions,
}: InteractionViewProps<'multiple_choice'>) {
  const { interaction } = card
  const selected = (response as string[] | undefined) ?? []
  const locked = phase.kind !== 'presenting' || hideActions
  const showFeedback =
    phase.kind === 'feedback' ||
    phase.kind === 'rating' ||
    phase.kind === 'transitioning'
  const grade = showFeedback ? gradeMultipleChoice(interaction, selected) : null

  // Shuffled once per card, not on every render/response change.
  const displayOptions = useMemo(
    () => (interaction.randomizeOptions ? shuffle(interaction.options) : interaction.options),
    [interaction],
  )

  function toggle(id: string) {
    if (locked) return
    if (interaction.selectionMode === 'multiple') {
      setResponse(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
    } else {
      // Single-select: clicking the already-selected option clears it.
      setResponse(selected.includes(id) ? [] : [id])
    }
  }

  return (
    <CardPanel>
      <InteractionLabel text="Multiple Choice" />
      <RichText
        text={card.prompt.value}
        className="mt-3 text-lg font-semibold leading-snug text-itera-ink-brand"
      />
      {interaction.selectionMode === 'multiple' && (
        <p className="mt-1 text-xs font-medium text-itera-muted">Select all that apply.</p>
      )}

      <div className="mt-4 space-y-2">
        {displayOptions.map((opt) => {
          const isSelected = selected.includes(opt.id)
          const isSelectedCorrect = grade?.selectedCorrect.includes(opt.id)
          const isSelectedIncorrect = grade?.selectedIncorrect.includes(opt.id)
          const isMissed = grade?.missedCorrect.includes(opt.id)
          const stateClass = grade
            ? isSelectedCorrect
              ? 'border-itera-success bg-itera-success-soft'
              : isSelectedIncorrect
                ? 'border-itera-error bg-itera-error-soft'
                : isMissed
                  ? 'border-itera-success/50 bg-itera-surface'
                  : 'border-itera-border bg-itera-surface opacity-60'
            : isSelected
              ? 'border-itera-accent bg-itera-accent-soft'
              : 'border-itera-border bg-itera-surface hover:border-itera-border-strong'

          return (
            <div
              key={opt.id}
              role={interaction.selectionMode === 'multiple' ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              aria-disabled={locked}
              tabIndex={locked ? -1 : 0}
              onClick={() => toggle(opt.id)}
              onKeyDown={(e) => {
                if (!locked && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  toggle(opt.id)
                }
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-itera-control border px-3.5 py-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-itera-accent focus-visible:ring-offset-2',
                locked && 'cursor-default',
                stateClass,
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-4 w-4 flex-none items-center justify-center border transition-colors',
                  interaction.selectionMode === 'multiple' ? 'rounded-[4px]' : 'rounded-full',
                  isSelected
                    ? 'border-itera-accent bg-itera-accent text-white'
                    : 'border-itera-border-strong bg-itera-surface',
                )}
              >
                {isSelected && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="flex-1 text-itera-ink">
                <InlineText text={opt.content.value} />
              </span>
              {isSelectedCorrect && <Check size={16} className="shrink-0 text-itera-success" />}
              {isSelectedIncorrect && <X size={16} className="shrink-0 text-itera-error" />}
              {isMissed && (
                <span className="shrink-0 text-xs font-medium text-itera-success">
                  Correct answer
                </span>
              )}
            </div>
          )
        })}
      </div>

      {phase.kind === 'presenting' && !hideActions && (
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={!responseReady}
          className="mt-4 rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
        >
          Submit answer
        </button>
      )}

      {grade && (
        <div
          className={cn(
            'mt-4 rounded-itera-control px-3.5 py-2.5 text-sm font-semibold',
            grade.correct
              ? 'bg-itera-success-soft text-itera-success'
              : 'bg-itera-error-soft text-itera-error',
          )}
        >
          {grade.correct ? 'Correct' : 'Incorrect'}
        </div>
      )}
    </CardPanel>
  )
}
