import { useMemo } from 'react'
import { selectClass } from '@/components/ui/Field'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import type { QuestionProps } from '../../registry/types'
import { thirdKey } from './keys'

type Option = { id: string; text: string }

// One match dropdown. On reveal it borders green/red by whether the chosen
// option belongs to this row.
function MatchSelect({
  value,
  options,
  disabled,
  state,
  onChange,
}: {
  value: string | undefined
  options: Option[]
  disabled: boolean
  state: 'none' | 'correct' | 'wrong'
  onChange: (value: string) => void
}) {
  return (
    <select
      className={cn(
        selectClass,
        'min-w-0 flex-1',
        state === 'correct' && 'border-green',
        state === 'wrong' && 'border-red',
      )}
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Choose…
      </option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.text}
        </option>
      ))}
    </select>
  )
}

// response maps each row's key -> the chosen option id (which is itself a pair
// id). A match is correct when those ids are equal. The right column uses the
// bare pair id as its key; the optional third column uses thirdKey(pairId).
export function MatchingQuestion({
  content,
  response,
  setResponse,
  revealed,
  readOnly,
}: QuestionProps<'matching'>) {
  const assign = (response as Record<string, string> | undefined) ?? {}
  const triple = Boolean(content.triple)

  // Shuffled options per column (stable per card).
  const rightOptions = useMemo(
    () => shuffle(content.pairs.map((p) => ({ id: p.id, text: p.right }))),
    [content.pairs],
  )
  const thirdOptions = useMemo(
    () => shuffle(content.pairs.map((p) => ({ id: p.id, text: p.third ?? '' }))),
    [content.pairs],
  )

  function choose(key: string, value: string) {
    if (revealed) return
    setResponse({ ...assign, [key]: value })
  }

  function stateFor(chosen: string | undefined, pairId: string) {
    if (!revealed) return 'none' as const
    return chosen === pairId ? ('correct' as const) : ('wrong' as const)
  }

  const headers = content.headers
  const showHeaders = Boolean(
    headers?.left || headers?.right || (triple && headers?.third),
  )

  return (
    <div className="space-y-3">
      <RichText
        text={content.prompt}
        className="text-[15px] font-semibold leading-snug"
      />
      <div className="space-y-2">
        {showHeaders && (
          <div className="flex flex-wrap items-center gap-2.5 px-3 text-sm font-bold">
            <span className="min-w-[35%] flex-1">{headers?.left}</span>
            <span className="invisible">→</span>
            <span className="min-w-0 flex-1">{headers?.right}</span>
            {triple && (
              <>
                <span className="invisible">→</span>
                <span className="min-w-0 flex-1">{headers?.third}</span>
              </>
            )}
          </div>
        )}
        {content.pairs.map((pair) => {
          const tKey = thirdKey(pair.id)
          const rChosen = assign[pair.id]
          const tChosen = assign[tKey]
          const rowOk =
            revealed &&
            rChosen === pair.id &&
            (!triple || tChosen === pair.id)

          return (
            <div
              key={pair.id}
              className={cn(
                'flex flex-wrap items-center gap-2.5 rounded-[10px] border px-3 py-2.5',
                revealed
                  ? rowOk
                    ? 'border-green bg-green/10'
                    : 'border-red bg-red/10'
                  : 'border-border',
              )}
            >
              <span className="min-w-[35%] flex-1 text-sm font-medium">
                <InlineText text={pair.left} />
              </span>
              <span className="text-faint">→</span>
              <MatchSelect
                value={rChosen}
                options={rightOptions}
                disabled={revealed || Boolean(readOnly)}
                state={stateFor(rChosen, pair.id)}
                onChange={(v) => choose(pair.id, v)}
              />
              {triple && (
                <>
                  <span className="text-faint">→</span>
                  <MatchSelect
                    value={tChosen}
                    options={thirdOptions}
                    disabled={revealed || Boolean(readOnly)}
                    state={stateFor(tChosen, pair.id)}
                    onChange={(v) => choose(tKey, v)}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
