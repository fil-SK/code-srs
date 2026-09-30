import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { LazyCodeEditor } from '@/components/code/LazyCodeEditor'
import { cn } from '@/lib/cn'
import type { WriteCodeAnswerFormState } from '@/domain/cards/writeCodeForm'

// One editable accepted-answer row in the Write Code editor's answer list.
// Mirrors MultipleChoiceOptionRow.tsx's move-up/move-down idiom (real
// <button>s, aria-disabled not native disabled at boundaries so focus
// survives repeated moves) — this is what keeps answer identity (the row's
// `answer.id`, used as the React key) stable across reorder/remove, rather
// than an index-keyed list that would silently reassign identity.
export function WriteCodeAnswerRow({
  answer,
  index,
  total,
  language,
  onCodeChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  canRemove,
}: {
  answer: WriteCodeAnswerFormState
  index: number
  total: number
  language: string
  onCodeChange: (code: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  const atTop = index === 0
  const atBottom = index === total - 1

  return (
    <div className="space-y-1.5 rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-fliptap-muted">
          Accepted answer {index + 1}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Move accepted answer ${index + 1} up`}
            aria-disabled={atTop}
            onClick={onMoveUp}
            className={cn(
              'rounded-fliptap-control p-1 text-fliptap-muted hover:text-fliptap-ink',
              atTop && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            aria-label={`Move accepted answer ${index + 1} down`}
            aria-disabled={atBottom}
            onClick={onMoveDown}
            className={cn(
              'rounded-fliptap-control p-1 text-fliptap-muted hover:text-fliptap-ink',
              atBottom && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={`Remove accepted answer ${index + 1}`}
            className={cn(
              'grid h-7 w-7 flex-none place-items-center rounded-[8px] border border-fliptap-border text-fliptap-muted',
              canRemove ? 'hover:border-fliptap-error hover:text-fliptap-error' : 'opacity-40',
            )}
          >
            <X size={14} />
          </button>
        </span>
      </div>
      <LazyCodeEditor value={answer.code} language={language} onChange={onCodeChange} />
    </div>
  )
}
