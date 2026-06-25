import { useEffect, useMemo } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import type { QuestionProps } from '../../registry/types'

function SortableItem({
  id,
  index,
  text,
}: {
  id: string
  index: number
  text: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex cursor-grab touch-none select-none items-center gap-3 rounded-[10px] border border-border bg-panel px-3 py-2.5 text-sm',
        isDragging && 'opacity-80 shadow-lg ring-1 ring-accent',
      )}
    >
      <GripVertical size={16} className="flex-none text-faint" />
      <span className="w-5 font-mono text-xs text-faint">{index + 1}.</span>
      <span className="flex-1">{text}</span>
    </li>
  )
}

export function OrderingQuestion({
  content,
  response,
  setResponse,
  revealed,
  readOnly,
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
  const draggable = !revealed && !readOnly

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = order.indexOf(active.id as string)
      const to = order.indexOf(over.id as string)
      setResponse(arrayMove(order, from, to))
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-[15px] font-semibold leading-snug">
        {content.prompt}
      </div>

      {draggable ? (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {order.map((id, idx) => (
                  <SortableItem
                    key={id}
                    id={id}
                    index={idx}
                    text={itemById.get(id)?.text ?? ''}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <p className="text-xs text-faint">Drag the rows to reorder.</p>
        </>
      ) : (
        <ol className="space-y-2">
          {order.map((id, idx) => {
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
                <span className="w-5 font-mono text-xs text-faint">
                  {idx + 1}.
                </span>
                <span className="flex-1">{itemById.get(id)?.text}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
