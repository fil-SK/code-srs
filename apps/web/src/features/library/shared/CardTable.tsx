import { useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Eye, EyeOff, FolderInput, Pencil, Trash2 } from 'lucide-react'
import type { Card } from '@/types'
import type { FlatDeck } from '@/domain/decks/tree'
import { cn } from '@/lib/cn'
import { createCard as buildCard } from '@/domain/cards/factory'
import { StatusBadge } from '@/features/cards/shared/StatusBadge'
import { formatDue } from '@/features/cards/shared/format'
import { OverflowMenu, type OverflowMenuItem } from '@/features/cards/shared/OverflowMenu'
import { useCreateCard, useDeleteCard, useSaveCard } from '@/hooks/useCards'
import { useDialogs } from '@/components/ui/dialogs'
import { FloatingPanel } from '@/components/ui/FloatingPanel'
import { rowVisualFor } from './rowVisuals'

// min-w guards the 1fr card column from being crushed to near-zero by the
// fixed-width columns when the table is narrower than its content. The drag
// handle floats in the row's left inset so card icons stay aligned close to
// the list border in both manual and sorted views.
function gridClass() {
  return 'grid min-w-[660px] grid-cols-[minmax(220px,1fr)_170px_140px_110px_36px] items-center gap-2'
}

export function CardTableHeader() {
  return (
    <div className={cn(gridClass(), 'pb-3 text-xs font-bold uppercase tracking-wider text-itera-muted')}>
      <span>Card</span>
      <span>Type</span>
      <span>Status</span>
      <span>Due</span>
      <span />
    </div>
  )
}

function TypeCell({ type }: { type: Card['interaction']['type'] }) {
  const visual = rowVisualFor(type)
  const Icon = visual.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-itera-ink">
      <span className={cn('grid h-5 w-5 flex-none place-items-center rounded text-white', visual.tileClass)}>
        <Icon size={12} />
      </span>
      {visual.label}
    </span>
  )
}

// A button + popover for moving a card to another deck — shared by both row
// kinds, toggled from the overflow menu's "Move" item rather than a separate
// always-visible icon button.
function MovePopover({
  anchor,
  decks,
  currentDeckId,
  onMove,
  onClose,
}: {
  anchor: HTMLElement | null
  decks: FlatDeck[]
  currentDeckId: string
  onMove: (deckId: string) => void
  onClose: () => void
}) {
  const others = decks.filter((d) => d.deck.id !== currentDeckId)

  return (
    <FloatingPanel anchor={anchor} onClose={onClose} ariaLabel="Move to deck" className="w-56">
      <div className="px-3 py-1.5 text-xs font-semibold text-itera-muted">Move to deck…</div>
      {others.length === 0 ? (
        <div className="px-3 py-1.5 text-sm text-itera-muted">No other decks.</div>
      ) : (
        <ul className="max-h-64 overflow-auto">
          {others.map((d) => (
            <li key={d.deck.id}>
              <button
                type="button"
                onClick={() => onMove(d.deck.id)}
                className="block w-full truncate px-3 py-1.5 text-left text-sm text-itera-ink hover:bg-itera-surface-subtle"
              >
                {d.path}
              </button>
            </li>
          ))}
        </ul>
      )}
    </FloatingPanel>
  )
}

// The card table row: type tile, title (+tags), Type/Status/Due columns, and
// one overflow menu (Edit/Duplicate/Move/Suspend/Delete). Clicking the row
// opens the card in study preview — reading a card is the common case and it
// is non-destructive, so editing lives one deliberate step away in the menu
// instead of being what a stray click does.
// `leading`/`containerRef`/`style`/`showGrip` let a parent (drag-reorder mode)
// make the row sortable.
export function CardTableRow({
  card,
  decks,
  now,
  compact = false,
  leading,
  containerRef,
  style,
  showGrip = false,
}: {
  card: Card
  decks: FlatDeck[]
  now: number
  compact?: boolean
  leading?: ReactNode
  containerRef?: Ref<HTMLDivElement>
  style?: CSSProperties
  showGrip?: boolean
}) {
  const navigate = useNavigate()
  const dialogs = useDialogs()
  const saveCard = useSaveCard()
  const deleteCard = useDeleteCard()
  const createCard = useCreateCard()
  const [showMove, setShowMove] = useState(false)
  const moveAnchorRef = useRef<HTMLDivElement>(null)
  const visual = rowVisualFor(card.interaction.type)
  const Icon = visual.icon
  const title = card.prompt.value.split('\n')[0]?.trim() || '(untitled)'

  function toggleSuspend() {
    saveCard.mutate({ ...card, suspended: !card.suspended })
  }
  async function remove() {
    const ok = await dialogs.confirm({
      title: 'Delete this card?',
      description: `“${title}” will be removed permanently. This cannot be undone.`,
      danger: true,
    })
    if (ok) deleteCard.mutate(card.id)
  }
  function duplicate() {
    createCard.mutate(
      buildCard({
        deckId: card.deckId,
        prompt: card.prompt,
        tip: card.tip,
        explanation: card.explanation,
        interaction: card.interaction,
        tags: card.tags,
      }),
    )
  }
  function moveTo(deckId: string) {
    saveCard.mutate({ ...card, deckId })
    setShowMove(false)
  }

  const items: OverflowMenuItem[] = [
    { label: 'Edit', icon: Pencil, onClick: () => navigate(`/cards/${card.id}/edit`) },
    { label: 'Duplicate', icon: Copy, onClick: duplicate },
    { label: 'Move', icon: FolderInput, onClick: () => setShowMove((v) => !v) },
    { label: card.suspended ? 'Unsuspend' : 'Suspend', icon: card.suspended ? Eye : EyeOff, onClick: toggleSuspend },
    { label: 'Delete', icon: Trash2, onClick: remove, danger: true },
  ]

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        'group relative',
        gridClass(),
        compact ? 'py-2' : 'py-3',
        card.suspended && 'opacity-55',
      )}
    >
      {showGrip && leading && (
        <span className="absolute -left-2.5 top-1/2 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {leading}
        </span>
      )}
      <Link
        to={`/cards/${card.id}/study`}
        className="flex min-w-0 items-center gap-3 transition-colors hover:text-itera-accent"
      >
        <div className={cn('grid h-8 w-8 flex-none place-items-center rounded-itera-control text-white', visual.tileClass)}>
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-itera-ink-brand">
            {title}
            {card.suspended && (
              <span className="ml-2 rounded bg-itera-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase text-itera-muted">
                Suspended
              </span>
            )}
          </div>
          {!compact && card.tags.length > 0 && (
            <div className="mt-0.5 flex gap-1.5">
              {card.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="rounded-itera-control bg-itera-surface-subtle px-1.5 py-0.5 text-[11px] text-itera-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <TypeCell type={card.interaction.type} />
      <StatusBadge state={card.scheduling.state} suspended={card.suspended} />
      <span className="text-sm text-itera-muted">{formatDue(card.scheduling.due, now)}</span>
      <div ref={moveAnchorRef} className="relative flex-none justify-self-end">
        <OverflowMenu items={items} ariaLabel="Card actions" />
        {showMove && (
          <MovePopover
            anchor={moveAnchorRef.current}
            decks={decks}
            currentDeckId={card.deckId}
            onMove={moveTo}
            onClose={() => setShowMove(false)}
          />
        )}
      </div>
    </div>
  )
}
