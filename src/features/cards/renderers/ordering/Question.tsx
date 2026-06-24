import { useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import type { QuestionProps } from '../../registry/types'

export function OrderingQuestion({
  content,
  response,
  setResponse,
  revealed,
}: QuestionProps<'ordering'>) {
  const itemById = useMemo(
    () => new Map(content.items.map((i) => [i.id, i])),
    [content.items],
  )
  const correctOrder = useMemo(
    () => content.items.map((i) => i.id),
    [content.items],
  )
  // Stable shuffled presentation order, recomputed only when the card changes.
  const shuffled = useMemo(() => shuffle(correctOrder), [correctOrder])

  useEffect(() => {
    if (response === undefined) setResponse(shuffled)
  }, [response, shuffled, setResponse])

  const order = (response as string[] | undefined) ?? shuffled

  function move(index: number, dir: -1 | 1) {
    if (revealed) return
    const j = index + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[index], next[j]] = [next[j], next[index]]
    setResponse(next)
  }

  return (
    <div className="space-y-3">
      <div className="text-[15px] font-semibold leading-snug">
        {content.prompt}
      </div>
      <ol className="space-y-2">
        {order.map((id, idx) => {
          const item = itemById.get(id)
          const placedRight = revealed && correctOrder[idx] === id
          return (
            <li
              key={id}
              className={cn(
                'flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-sm',
                revealed
                  ? placedRight
                    ? 'border-green bg-green/10'
                    : 'border-red bg-red/10'
                  : 'border-border',
              )}
            >
              <span className="w-5 font-mono text-xs text-faint">{idx + 1}.</span>
              <span className="flex-1">{item?.text}</span>
              {!revealed && (
                <span className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                    className="text-muted hover:text-text disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === order.length - 1}
                    aria-label="Move down"
                    className="text-muted hover:text-text disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
