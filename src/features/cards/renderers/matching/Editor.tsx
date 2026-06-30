import { Plus, X } from 'lucide-react'
import type { MatchingContent } from '@/types'
import { newId } from '@/lib/id'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { EditorProps } from '../../registry/types'
import { ExplanationField } from '../Explanation'
import { fixedValues, isFixed, type Col } from './columns'

export function MatchingEditor({
  content,
  onChange,
}: EditorProps<'matching'>) {
  function update(patch: Partial<MatchingContent>) {
    onChange({ ...content, ...patch })
  }

  function setPair(id: string, side: 'left' | 'right' | 'third', value: string) {
    update({
      pairs: content.pairs.map((p) =>
        p.id === id ? { ...p, [side]: value } : p,
      ),
    })
  }

  function setHeader(col: 'left' | 'right' | 'third', value: string) {
    update({ headers: { ...content.headers, [col]: value } })
  }

  function setColumnOptions(col: Col, values: string[] | undefined) {
    const options = { ...content.options }
    if (values === undefined) delete options[col]
    else options[col] = values
    update({ options: Object.keys(options).length ? options : undefined })
  }

  const triple = Boolean(content.triple)

  // Per-column "fixed dropdown list" editor.
  function columnOptions(col: Col, label: string) {
    const values = content.options?.[col]
    const fixed = isFixed(content, col)
    return (
      <div className="rounded-[9px] border border-border p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fixed}
            onChange={(e) =>
              setColumnOptions(col, e.target.checked ? ['', ''] : undefined)
            }
          />
          <span className="font-medium">{label}</span>
          <span className="text-muted">— pick from a fixed list</span>
        </label>
        {fixed && values && (
          <div className="mt-2 space-y-2">
            {values.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={fieldClass}
                  value={v}
                  onChange={(e) =>
                    setColumnOptions(
                      col,
                      values.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  placeholder="Option value (e.g. Yes)"
                />
                <button
                  type="button"
                  onClick={() =>
                    setColumnOptions(
                      col,
                      values.filter((_, j) => j !== i),
                    )
                  }
                  disabled={values.length <= 2}
                  className={cn(
                    'grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-border text-muted',
                    values.length <= 2
                      ? 'opacity-40'
                      : 'hover:border-red hover:text-red',
                  )}
                  aria-label="Remove option"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              onClick={() => setColumnOptions(col, [...values, ''])}
            >
              <Plus size={14} /> Add option
            </Button>
          </div>
        )}
      </div>
    )
  }

  // A row's cell for an answer column: a dropdown when the column is fixed
  // (pick the correct value), else a free-text input.
  function answerCell(
    pair: MatchingContent['pairs'][number],
    col: Col,
    placeholder: string,
  ) {
    const value = col === 'right' ? pair.right : (pair.third ?? '')
    if (isFixed(content, col)) {
      return (
        <select
          className={selectClass}
          value={value}
          onChange={(e) => setPair(pair.id, col, e.target.value)}
        >
          <option value="" disabled>
            Choose…
          </option>
          {fixedValues(content, col).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      )
    }
    return (
      <input
        className={fieldClass}
        value={value}
        onChange={(e) => setPair(pair.id, col, e.target.value)}
        placeholder={placeholder}
      />
    )
  }

  return (
    <>
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={2}
          value={content.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder="Match each STL container to its lookup complexity."
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={triple}
          onChange={(e) => update({ triple: e.target.checked })}
        />
        Three-part matching (left → middle → right)
      </label>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Column headers (optional)
        </span>
        <div className="flex items-center gap-2">
          <input
            className={fieldClass}
            value={content.headers?.left ?? ''}
            onChange={(e) => setHeader('left', e.target.value)}
            placeholder="Left header"
          />
          <span className="text-faint">→</span>
          <input
            className={fieldClass}
            value={content.headers?.right ?? ''}
            onChange={(e) => setHeader('right', e.target.value)}
            placeholder="Right header"
          />
          {triple && (
            <>
              <span className="text-faint">→</span>
              <input
                className={fieldClass}
                value={content.headers?.third ?? ''}
                onChange={(e) => setHeader('third', e.target.value)}
                placeholder="Third header"
              />
            </>
          )}
          <span className="h-9 w-9 flex-none" />
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Answer dropdowns
        </span>
        {columnOptions('right', triple ? 'Middle column' : 'Right column')}
        {triple && columnOptions('third', 'Right column')}
        <p className="text-xs text-faint">
          Turn a column on to share a fixed list of answers (e.g. Yes / No)
          across rows. Off means each row’s answers are matched uniquely.
        </p>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {triple ? 'Rows (left → middle → right)' : 'Pairs (left ↔ right)'}
        </span>
        {content.pairs.map((pair) => (
          <div key={pair.id} className="flex items-center gap-2">
            <input
              className={fieldClass}
              value={pair.left}
              onChange={(e) => setPair(pair.id, 'left', e.target.value)}
              placeholder="Concept"
            />
            <span className="text-faint">→</span>
            {answerCell(pair, 'right', 'Match')}
            {triple && (
              <>
                <span className="text-faint">→</span>
                {answerCell(pair, 'third', 'Second match')}
              </>
            )}
            <button
              type="button"
              onClick={() =>
                update({ pairs: content.pairs.filter((p) => p.id !== pair.id) })
              }
              disabled={content.pairs.length <= 2}
              className={cn(
                'grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-border text-muted',
                content.pairs.length <= 2
                  ? 'opacity-40'
                  : 'hover:border-red hover:text-red',
              )}
              aria-label="Remove pair"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={() =>
            update({
              pairs: [...content.pairs, { id: newId(), left: '', right: '' }],
            })
          }
        >
          <Plus size={14} /> Add pair
        </Button>
      </div>

      <ExplanationField
        value={content.explanation}
        onChange={(explanation) => update({ explanation })}
      />
    </>
  )
}
