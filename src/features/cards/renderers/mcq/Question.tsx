import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { QuestionProps } from '../../registry/types'

export function McqQuestion({
  content,
  response,
  setResponse,
  revealed,
}: QuestionProps<'mcq'>) {
  const selected = (response as string[] | undefined) ?? []

  function toggle(id: string) {
    if (revealed) return
    if (content.multiple) {
      setResponse(
        selected.includes(id)
          ? selected.filter((x) => x !== id)
          : [...selected, id],
      )
    } else {
      setResponse([id])
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-[15px] font-semibold leading-snug">
        {content.prompt}
      </div>
      <div className="space-y-2">
        {content.options.map((opt) => {
          const isSel = selected.includes(opt.id)
          const isCorrect = content.correct.includes(opt.id)
          const stateClass = revealed
            ? isCorrect
              ? 'border-green bg-green/10'
              : isSel
                ? 'border-red bg-red/10'
                : 'border-border opacity-60'
            : isSel
              ? 'border-accent bg-accent-soft'
              : 'border-border hover:border-accent'

          return (
            <button
              key={opt.id}
              type="button"
              disabled={revealed}
              onClick={() => toggle(opt.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[10px] border px-3.5 py-3 text-left text-sm',
                stateClass,
              )}
            >
              <span
                className={cn(
                  'grid h-[18px] w-[18px] flex-none place-items-center border-2',
                  content.multiple ? 'rounded-md' : 'rounded-full',
                  isSel ? 'border-accent bg-accent text-white' : 'border-faint',
                )}
              >
                {revealed && isCorrect ? (
                  <Check size={12} />
                ) : revealed && isSel && !isCorrect ? (
                  <X size={12} />
                ) : isSel ? (
                  <Check size={12} />
                ) : null}
              </span>
              <span>{opt.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
