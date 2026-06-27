import { useMemo } from 'react'
import { selectClass } from '@/components/ui/Field'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import type { QuestionProps } from '../../registry/types'

// response maps each left pair's id -> the chosen right pair's id. A match is
// correct when those ids are equal (i.e. the right belongs to the same pair).
export function MatchingQuestion({
  content,
  response,
  setResponse,
  revealed,
  readOnly,
}: QuestionProps<'matching'>) {
  const assign = (response as Record<string, string> | undefined) ?? {}

  // Shuffled right-hand options (stable per card).
  const rightOptions = useMemo(
    () => shuffle(content.pairs.map((p) => ({ id: p.id, text: p.right }))),
    [content.pairs],
  )

  function setMatch(leftId: string, rightId: string) {
    if (revealed) return
    setResponse({ ...assign, [leftId]: rightId })
  }

  return (
    <div className="space-y-3">
      <RichText
        text={content.prompt}
        className="text-[15px] font-semibold leading-snug"
      />
      <div className="space-y-2">
        {content.pairs.map((pair) => {
          const chosen = assign[pair.id]
          const correct = revealed && chosen === pair.id
          return (
            <div
              key={pair.id}
              className={cn(
                'flex items-center gap-3 rounded-[10px] border px-3 py-2.5',
                revealed
                  ? correct
                    ? 'border-green bg-green/10'
                    : 'border-red bg-red/10'
                  : 'border-border',
              )}
            >
              <span className="flex-1 text-sm font-medium">
                <InlineText text={pair.left} />
              </span>
              <span className="text-faint">→</span>
              <select
                className={cn(selectClass, 'max-w-[52%]')}
                disabled={revealed || readOnly}
                value={chosen ?? ''}
                onChange={(e) => setMatch(pair.id, e.target.value)}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {rightOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.text}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
