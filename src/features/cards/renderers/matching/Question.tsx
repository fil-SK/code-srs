import { useMemo } from 'react'
import { selectClass } from '@/components/ui/Field'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import type { QuestionProps } from '../../registry/types'
import {
  colKey,
  correctTarget,
  fixedValues,
  isFixed,
  type Col,
} from './columns'

type Option = { id: string; text: string }

// One match dropdown. On reveal it borders green/red by whether the chosen
// option is the correct one for this row.
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

// response maps each row's column key -> the chosen option id. In unique
// matching the option id is a pair id (correct when it equals this row's pair);
// in fixed-dropdown mode the option id is the value itself (correct when it
// equals this row's value, so several rows can share an answer).
export function MatchingQuestion({
  content,
  response,
  setResponse,
  revealed,
  readOnly,
}: QuestionProps<'matching'>) {
  const assign = (response as Record<string, string> | undefined) ?? {}
  const triple = Boolean(content.triple)

  // Options per column: a shared fixed list (author order) or the shuffled row
  // values (unique matching).
  const optionsFor = useMemo(() => {
    const build = (col: Col): Option[] =>
      isFixed(content, col)
        ? fixedValues(content, col).map((v) => ({ id: v, text: v }))
        : shuffle(
            content.pairs.map((p) => ({
              id: p.id,
              text: col === 'right' ? p.right : (p.third ?? ''),
            })),
          )
    return { right: build('right'), third: build('third') }
  }, [content])

  // Display the rows in a random order (stable per open) so the answer pattern
  // can't be memorized by position. Grading is keyed by pair id, so this does
  // not affect correctness.
  const displayPairs = useMemo(() => shuffle(content.pairs), [content])

  function choose(key: string, value: string) {
    if (revealed) return
    setResponse({ ...assign, [key]: value })
  }

  function stateFor(col: Col, pair: (typeof content.pairs)[number]) {
    if (!revealed) return 'none' as const
    const chosen = assign[colKey(col, pair.id)]
    return chosen === correctTarget(content, col, pair)
      ? ('correct' as const)
      : ('wrong' as const)
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
        {displayPairs.map((pair) => {
          const rowOk =
            revealed &&
            stateFor('right', pair) === 'correct' &&
            (!triple || stateFor('third', pair) === 'correct')

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
                value={assign[colKey('right', pair.id)]}
                options={optionsFor.right}
                disabled={revealed || Boolean(readOnly)}
                state={stateFor('right', pair)}
                onChange={(v) => choose(colKey('right', pair.id), v)}
              />
              {triple && (
                <>
                  <span className="text-faint">→</span>
                  <MatchSelect
                    value={assign[colKey('third', pair.id)]}
                    options={optionsFor.third}
                    disabled={revealed || Boolean(readOnly)}
                    state={stateFor('third', pair)}
                    onChange={(v) => choose(colKey('third', pair.id), v)}
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
