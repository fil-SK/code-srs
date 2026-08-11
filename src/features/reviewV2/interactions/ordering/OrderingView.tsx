import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { InlineText, RichText } from '@/components/text/RichText'
import { cn } from '@/lib/cn'
import { shuffle } from '@/lib/shuffle'
import { gradeOrdering } from '@/domain/grading/ordering'
import type { ID } from '@/types/common'
import { FlashcardSurface } from '../../components/FlashcardSurface'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'
import { OrderingRow } from './OrderingRow'

export function OrderingView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
  responseReady,
  hideActions,
}: InteractionViewProps<'ordering'>) {
  const { interaction } = card
  const itemById = useMemo(
    () => new Map(interaction.items.map((i) => [i.id, i])),
    [interaction],
  )
  // randomize: false still needs an order that isn't a giveaway (items are
  // stored in correct order) - a stable id sort is deterministic (same
  // scramble every time this card is shown) without spelling out the answer.
  const initialOrder = useMemo(() => {
    const ids = interaction.items.map((i) => i.id)
    return interaction.randomize ? shuffle(ids) : [...ids].sort()
  }, [interaction])

  useEffect(() => {
    if (response === undefined) setResponse(initialOrder)
    // Mount-only seed, same convention as Write Code's starter-code effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const order = (response as ID[] | undefined) ?? initialOrder
  const flipped = phase.kind !== 'presenting'
  const locked = flipped || Boolean(hideActions)
  // Visible index numbers and button aria-labels change after a move, but
  // that's not reliably announced by screen readers on its own - an
  // aria-live region gives an explicit, unambiguous announcement of the new
  // position (task requirement: "announce or expose the updated position
  // accessibly").
  const [announcement, setAnnouncement] = useState('')
  const grade = flipped ? gradeOrdering(interaction, order) : null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function move(index: number, direction: -1 | 1) {
    const to = index + direction
    if (to < 0 || to >= order.length) return // clean no-op at the boundary
    const next = [...order]
    const [id] = next.splice(index, 1)
    next.splice(to, 0, id)
    setResponse(next)
    const label = itemById.get(id)?.content.value ?? ''
    setAnnouncement(`${label} moved to position ${to + 1} of ${order.length}`)
  }

  function onDragEnd(e: DragEndEvent) {
    if (locked) return
    const { active, over } = e
    if (over && active.id !== over.id) {
      const from = order.indexOf(active.id as string)
      const to = order.indexOf(over.id as string)
      setResponse(arrayMove(order, from, to))
      const label = itemById.get(active.id as string)?.content.value ?? ''
      setAnnouncement(`${label} moved to position ${to + 1} of ${order.length}`)
    }
  }

  return (
    <FlashcardSurface
      flipped={flipped}
      onFlip={onPrimaryAction}
      ariaLabel={
        flipped
          ? 'Ordering card, results showing'
          : 'Ordering card, arrange the items and submit to flip'
      }
      front={
        flipped ? null : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <InteractionLabel type="ordering" />
            <RichText
              text={card.prompt.value}
              className="mt-2 text-2xl font-bold leading-snug text-itera-ink-brand"
            />
            {!locked && (
              <p className="text-sm text-itera-muted-light">
                Drag items into the correct sequence.
              </p>
            )}
          </div>
          <div aria-live="polite" className="sr-only">
            {announcement}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ol className="space-y-3">
                {order.map((id, idx) => {
                  const item = itemById.get(id)
                  return (
                    <OrderingRow
                      key={id}
                      id={id}
                      index={idx}
                      total={order.length}
                      content={item?.content.value ?? ''}
                      locked={locked}
                      showFeedback={false}
                      correct={false}
                      expectedIndex={idx}
                      onMoveUp={() => move(idx, -1)}
                      onMoveDown={() => move(idx, 1)}
                    />
                  )
                })}
              </ol>
            </SortableContext>
          </DndContext>

          {!hideActions && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onPrimaryAction}
                disabled={!responseReady}
                className="rounded-itera-control bg-itera-accent px-8 py-3 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
              >
                Submit answer
              </button>
            </div>
          )}
        </div>
        )
      }
      back={
        !flipped ? null : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <InteractionLabel type="ordering" />
            <RichText
              text={card.prompt.value}
              className="mt-2 text-xl font-bold leading-snug text-itera-ink-brand"
            />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={() => {}}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ol className="space-y-3">
                {order.map((id, idx) => {
                  const item = itemById.get(id)
                  const cell = grade?.positions.find((p) => p.itemId === id)
                  return (
                    <OrderingRow
                      key={id}
                      id={id}
                      index={idx}
                      total={order.length}
                      content={item?.content.value ?? ''}
                      locked
                      showFeedback
                      correct={cell?.correct ?? false}
                      expectedIndex={cell?.correctIndex ?? idx}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                    />
                  )
                })}
              </ol>
            </SortableContext>
          </DndContext>

          {grade && (
            <div
              className={cn(
                'rounded-itera-control px-3.5 py-2.5 text-center text-sm font-semibold',
                grade.correct
                  ? 'bg-itera-success-soft text-itera-success'
                  : 'bg-itera-error-soft text-itera-error',
              )}
            >
              {grade.correct ? 'Correct' : `${Math.round(grade.score * 100)}% in the right position`}
            </div>
          )}

          {grade && !grade.correct && (
            <div className="rounded-itera-control border border-dashed border-itera-border px-3.5 py-2.5">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-itera-muted">
                Correct order
              </div>
              <ol className="space-y-1 text-sm text-itera-ink">
                {interaction.correctOrder.map((id, i) => (
                  <li key={id}>
                    {i + 1}. <InlineText text={itemById.get(id)?.content.value ?? ''} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        )
      }
    />
  )
}
