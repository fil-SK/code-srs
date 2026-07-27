import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import { gradeMultipleChoice } from '@/domain/grading/multipleChoice'
import { FlashcardSurface } from '../../components/FlashcardSurface'
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
  const flipped = phase.kind !== 'presenting'
  const locked = flipped || Boolean(hideActions)
  const grade = flipped ? gradeMultipleChoice(interaction, selected) : null

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
    <FlashcardSurface
      flipped={flipped}
      onFlip={onPrimaryAction}
      ariaLabel={
        flipped
          ? 'Multiple choice card, results showing'
          : 'Multiple choice card, choose an answer and submit to flip'
      }
      front={
        flipped ? null : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <InteractionLabel type="multiple_choice" />
            <RichText
              text={card.prompt.value}
              className="mt-2 text-2xl font-bold leading-snug text-itera-ink-brand"
            />
            {interaction.selectionMode === 'multiple' && (
              <p className="text-xs font-medium text-itera-muted">Select all that apply.</p>
            )}
          </div>

          <div className="space-y-2">
            {displayOptions.map((opt) => {
              const isSelected = selected.includes(opt.id)
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
                    'cursor-pointer rounded-itera-control border px-3.5 py-3 text-center text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-itera-accent focus-visible:ring-offset-2',
                    locked && 'cursor-default',
                    isSelected
                      ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                      : 'border-itera-border bg-itera-surface text-itera-ink hover:border-itera-border-strong',
                  )}
                >
                  <InlineText text={opt.content.value} />
                </div>
              )
            })}
          </div>

          {!hideActions && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={!responseReady}
              className="rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
            >
              Submit answer
            </button>
          )}
        </div>
        )
      }
      back={
        !flipped ? null : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center">
            <InteractionLabel type="multiple_choice" />
            <RichText
              text={card.prompt.value}
              className="mt-2 text-xl font-bold leading-snug text-itera-ink-brand"
            />
          </div>

          <div className="space-y-2">
            {displayOptions.map((opt) => {
              const isSelected = selected.includes(opt.id)
              const isSelectedCorrect = grade?.selectedCorrect.includes(opt.id)
              const isSelectedIncorrect = grade?.selectedIncorrect.includes(opt.id)
              const isMissed = grade?.missedCorrect.includes(opt.id)
              const stateClass = isSelectedCorrect
                ? 'border-itera-success bg-itera-success-soft'
                : isSelectedIncorrect
                  ? 'border-itera-error bg-itera-error-soft'
                  : isMissed
                    ? 'border-itera-success/50 bg-itera-surface'
                    : 'border-itera-border bg-itera-surface opacity-60'

              return (
                <div
                  key={opt.id}
                  className={cn(
                    'flex items-center gap-3 rounded-itera-control border px-3.5 py-3 text-center text-sm',
                    stateClass,
                  )}
                >
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
                  {!isSelected && !isMissed && <span className="w-4 shrink-0" />}
                </div>
              )
            })}
          </div>

          {grade && (
            <div
              className={cn(
                'rounded-itera-control px-3.5 py-2.5 text-center text-sm font-semibold',
                grade.correct
                  ? 'bg-itera-success-soft text-itera-success'
                  : 'bg-itera-error-soft text-itera-error',
              )}
            >
              {grade.correct ? 'Correct' : 'Incorrect'}
            </div>
          )}
        </div>
        )
      }
    />
  )
}
