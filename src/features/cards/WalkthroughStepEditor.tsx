import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type {
  WalkthroughAcceptedAnswerFormState,
  WalkthroughRangeFormState,
  WalkthroughStepFormState,
  WalkthroughStepResponseType,
} from '@/domain/cards/walkthroughForm'
import { MultipleChoiceOptionRow } from './MultipleChoiceOptionRow'

const RESPONSE_TYPE_LABEL: Record<WalkthroughStepResponseType, string> = {
  recall: 'Recall',
  multiple_choice: 'Multiple choice',
  exact_input: 'Exact answer',
}

function AcceptedAnswerRow({
  answer,
  onTextChange,
  onRemove,
  canRemove,
}: {
  answer: WalkthroughAcceptedAnswerFormState
  onTextChange: (text: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        className={fieldClass}
        value={answer.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Accepted answer (e.g. undefined behavior)"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove accepted answer"
        className={cn(
          'grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-itera-border text-itera-muted',
          canRemove ? 'hover:border-itera-error hover:text-itera-error' : 'opacity-40',
        )}
      >
        <X size={15} />
      </button>
    </div>
  )
}

function RangeRow({
  range,
  onChange,
  onRemove,
}: {
  range: WalkthroughRangeFormState
  onChange: (patch: Partial<Pick<WalkthroughRangeFormState, 'start' | 'end'>>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        className={cn(fieldClass, 'w-20')}
        value={range.start}
        onChange={(e) => onChange({ start: e.target.value })}
        placeholder="Start"
        aria-label="Start line"
      />
      <span className="text-xs text-itera-muted">to</span>
      <input
        type="number"
        min={1}
        className={cn(fieldClass, 'w-20')}
        value={range.end}
        onChange={(e) => onChange({ end: e.target.value })}
        placeholder="End"
        aria-label="End line"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove highlighted range"
        className="grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-itera-border text-itera-muted hover:border-itera-error hover:text-itera-error"
      >
        <X size={15} />
      </button>
    </div>
  )
}

// One step's authoring card: prompt, the shared code's highlighted line
// ranges (add/remove rows of start/end numbers, not a free-text spec — see
// walkthroughForm.ts's header comment), a response-type selector, and that
// type's sub-editor. Multiple Choice reuses MultipleChoiceOptionRow directly
// (its props are already generic over McOptionFormState) rather than a
// duplicate renderer; exact-input's accepted-answer list is a small local
// row, not WriteCodeAnswerRow, which is code-editor-backed and wrong-shaped
// for plain-text answers.
export function WalkthroughStepEditor({
  step,
  index,
  total,
  canRemove,
  onPromptChange,
  onTipChange,
  onExplanationChange,
  onResponseTypeChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddRange,
  onRangeChange,
  onRemoveRange,
  onRecallAnswerChange,
  onMcSelectionModeChange,
  onAddMcOption,
  onMcOptionTextChange,
  onToggleMcOptionCorrect,
  onMoveMcOptionUp,
  onMoveMcOptionDown,
  onRemoveMcOption,
  onAddAcceptedAnswer,
  onAcceptedAnswerChange,
  onRemoveAcceptedAnswer,
}: {
  step: WalkthroughStepFormState
  index: number
  total: number
  canRemove: boolean
  onPromptChange: (prompt: string) => void
  onTipChange: (tip: string) => void
  onExplanationChange: (explanation: string) => void
  onResponseTypeChange: (type: WalkthroughStepResponseType) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onAddRange: () => void
  onRangeChange: (rangeId: string, patch: Partial<Pick<WalkthroughRangeFormState, 'start' | 'end'>>) => void
  onRemoveRange: (rangeId: string) => void
  onRecallAnswerChange: (answer: string) => void
  onMcSelectionModeChange: (mode: 'single' | 'multiple') => void
  onAddMcOption: () => void
  onMcOptionTextChange: (optionId: string, text: string) => void
  onToggleMcOptionCorrect: (optionId: string) => void
  onMoveMcOptionUp: (optionId: string) => void
  onMoveMcOptionDown: (optionId: string) => void
  onRemoveMcOption: (optionId: string) => void
  onAddAcceptedAnswer: () => void
  onAcceptedAnswerChange: (answerId: string, text: string) => void
  onRemoveAcceptedAnswer: (answerId: string) => void
}) {
  const atTop = index === 0
  const atBottom = index === total - 1

  return (
    <div className="space-y-3 rounded-itera-control border border-itera-border p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-2 flex flex-none items-center gap-1">
          <button
            type="button"
            aria-label={`Move step ${index + 1} up`}
            aria-disabled={atTop}
            onClick={onMoveUp}
            className={cn(
              'rounded-itera-control p-1 text-itera-muted hover:text-itera-ink',
              atTop && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            aria-label={`Move step ${index + 1} down`}
            aria-disabled={atBottom}
            onClick={onMoveDown}
            className={cn(
              'rounded-itera-control p-1 text-itera-muted hover:text-itera-ink',
              atBottom && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronDown size={16} />
          </button>
        </span>

        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-itera-muted">
              Step {index + 1}
            </span>
            <button
              type="button"
              onClick={onRemove}
              disabled={!canRemove}
              aria-label={`Remove step ${index + 1}`}
              className={cn(
                'grid h-8 w-8 flex-none place-items-center rounded-[9px] border border-itera-border text-itera-muted',
                canRemove ? 'hover:border-itera-error hover:text-itera-error' : 'opacity-40',
              )}
            >
              <X size={14} />
            </button>
          </div>

          <textarea
            className={fieldClass}
            rows={2}
            value={step.prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="What should the learner notice or do at this step?"
          />

          <div className="space-y-1.5">
            <span className="block text-xs text-itera-muted">
              Highlighted lines in the shared code (optional)
            </span>
            {step.ranges.map((range) => (
              <RangeRow
                key={range.id}
                range={range}
                onChange={(patch) => onRangeChange(range.id, patch)}
                onRemove={() => onRemoveRange(range.id)}
              />
            ))}
            <Button type="button" variant="ghost" onClick={onAddRange}>
              <Plus size={14} /> Add highlighted range
            </Button>
          </div>

          <div className="flex gap-1 rounded-itera-control border border-itera-border p-1">
            {(Object.keys(RESPONSE_TYPE_LABEL) as WalkthroughStepResponseType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onResponseTypeChange(t)}
                className={cn(
                  'flex-1 rounded-[7px] py-1.5 text-xs font-semibold transition-colors',
                  step.responseType === t
                    ? 'bg-itera-accent-soft text-itera-ink-brand'
                    : 'text-itera-muted',
                )}
              >
                {RESPONSE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {step.responseType === 'recall' && (
            <textarea
              className={fieldClass}
              rows={2}
              value={step.recallAnswer}
              onChange={(e) => onRecallAnswerChange(e.target.value)}
              placeholder="The answer revealed to the learner at this step…"
            />
          )}

          {step.responseType === 'multiple_choice' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-sm text-itera-ink">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={step.mcSelectionMode === 'multiple'}
                  onClick={() =>
                    onMcSelectionModeChange(step.mcSelectionMode === 'multiple' ? 'single' : 'multiple')
                  }
                  className={cn(
                    'flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border transition-colors',
                    step.mcSelectionMode === 'multiple'
                      ? 'border-itera-accent bg-itera-accent'
                      : 'border-itera-border-strong bg-itera-surface',
                  )}
                >
                  {step.mcSelectionMode === 'multiple' && (
                    <span className="h-2 w-2 rounded-[1px] bg-white" />
                  )}
                </button>
                Allow multiple correct answers
              </label>
              {step.mcOptions.map((opt, i) => (
                <MultipleChoiceOptionRow
                  key={opt.id}
                  option={opt}
                  index={i}
                  total={step.mcOptions.length}
                  selectionMode={step.mcSelectionMode}
                  onTextChange={(text) => onMcOptionTextChange(opt.id, text)}
                  onToggleCorrect={() => onToggleMcOptionCorrect(opt.id)}
                  onMoveUp={() => onMoveMcOptionUp(opt.id)}
                  onMoveDown={() => onMoveMcOptionDown(opt.id)}
                  onRemove={() => onRemoveMcOption(opt.id)}
                  canRemove={step.mcOptions.length > 2}
                />
              ))}
              <Button type="button" variant="ghost" onClick={onAddMcOption}>
                <Plus size={14} /> Add option
              </Button>
            </div>
          )}

          {step.responseType === 'exact_input' && (
            <div className="space-y-2">
              {step.acceptedAnswers.map((answer) => (
                <AcceptedAnswerRow
                  key={answer.id}
                  answer={answer}
                  onTextChange={(text) => onAcceptedAnswerChange(answer.id, text)}
                  onRemove={() => onRemoveAcceptedAnswer(answer.id)}
                  canRemove={step.acceptedAnswers.length > 1}
                />
              ))}
              <Button type="button" variant="ghost" onClick={onAddAcceptedAnswer}>
                <Plus size={14} /> Add accepted answer
              </Button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-xs text-itera-muted">Tip for this step (optional)</span>
              <textarea
                className={fieldClass}
                rows={2}
                value={step.tip}
                onChange={(e) => onTipChange(e.target.value)}
                placeholder="A hint that only applies to this step…"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs text-itera-muted">
                Explanation for this step (optional)
              </span>
              <textarea
                className={fieldClass}
                rows={2}
                value={step.explanation}
                onChange={(e) => onExplanationChange(e.target.value)}
                placeholder="Extra context shown after this step is answered…"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
