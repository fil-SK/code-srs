import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import type { OrderingContent } from '@/types'
import { newId } from '@/lib/id'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { EditorProps } from '../../registry/types'

// Items are stored in the correct order; this editor's list order IS that order.
export function OrderingEditor({
  content,
  onChange,
}: EditorProps<'ordering'>) {
  function update(patch: Partial<OrderingContent>) {
    onChange({ ...content, ...patch })
  }

  function setText(id: string, text: string) {
    update({
      items: content.items.map((i) => (i.id === id ? { ...i, text } : i)),
    })
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir
    if (j < 0 || j >= content.items.length) return
    const items = [...content.items]
    ;[items[index], items[j]] = [items[j], items[index]]
    update({ items })
  }

  return (
    <>
      <Field label="Prompt">
        <textarea
          className={fieldClass}
          rows={2}
          value={content.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder="Arrange the MLIR lowering stages in order."
        />
      </Field>

      <div className="space-y-2">
        <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Steps (top = first)
        </span>
        {content.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move up"
                className="text-muted hover:text-text disabled:opacity-30"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === content.items.length - 1}
                aria-label="Move down"
                className="text-muted hover:text-text disabled:opacity-30"
              >
                <ChevronDown size={15} />
              </button>
            </span>
            <input
              className={fieldClass}
              value={item.text}
              onChange={(e) => setText(item.id, e.target.value)}
              placeholder={`Step ${idx + 1}`}
            />
            <button
              type="button"
              onClick={() =>
                update({ items: content.items.filter((i) => i.id !== item.id) })
              }
              disabled={content.items.length <= 2}
              className={cn(
                'grid h-9 w-9 flex-none place-items-center rounded-[9px] border border-border text-muted',
                content.items.length <= 2
                  ? 'opacity-40'
                  : 'hover:border-red hover:text-red',
              )}
              aria-label="Remove step"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          onClick={() =>
            update({ items: [...content.items, { id: newId(), text: '' }] })
          }
        >
          <Plus size={14} /> Add step
        </Button>
      </div>
    </>
  )
}
