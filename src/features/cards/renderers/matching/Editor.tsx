import { Plus, X } from 'lucide-react'
import type { MatchingContent } from '@/types'
import { newId } from '@/lib/id'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { EditorProps } from '../../registry/types'

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

  const triple = Boolean(content.triple)

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
            <input
              className={fieldClass}
              value={pair.right}
              onChange={(e) => setPair(pair.id, 'right', e.target.value)}
              placeholder="Match"
            />
            {triple && (
              <>
                <span className="text-faint">→</span>
                <input
                  className={fieldClass}
                  value={pair.third ?? ''}
                  onChange={(e) => setPair(pair.id, 'third', e.target.value)}
                  placeholder="Second match"
                />
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
    </>
  )
}
