import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Copy, Eye, EyeOff, FolderInput, Trash2 } from 'lucide-react'
import type { Card } from '@/types'
import type { CardV2Record } from '@/types/cardV2'
import type { FlatDeck } from '@/domain/decks/tree'
import { cn } from '@/lib/cn'
import { getCardTitle } from '@/features/cards/cardTypeMeta'
import { createCardV2 } from '@/domain/cardsV2/factory'
import { StatusBadge } from '@/features/cardsV2/shared/StatusBadge'
import { formatDue } from '@/features/cardsV2/shared/format'
import { OverflowMenu, type OverflowMenuItem } from '@/features/cardsV2/shared/OverflowMenu'
import { useCreateCardV2, useDeleteCardV2, useSaveCardV2 } from '@/hooks/useCardsV2'
import { rowVisualFor } from './rowVisuals'

// min-w guards the 1fr card column from being crushed to near-zero by the
// fixed-width columns when the table is narrower than its content — the
// overflow-x-auto ancestor scrolls instead. A leading 28px grip column is
// only reserved when a row actually supplies a drag handle (manual sort).
function gridClass(showGrip: boolean) {
  return cn(
    'grid items-center gap-3',
    showGrip
      ? 'grid-cols-[28px_minmax(220px,1fr)_170px_140px_110px_36px] min-w-[720px]'
      : 'grid-cols-[minmax(220px,1fr)_170px_140px_110px_36px] min-w-[660px]',
  )
}

export function CardTableHeader({ showGrip = false }: { showGrip?: boolean }) {
  return (
    <div className={cn(gridClass(showGrip), 'pb-3 text-xs font-bold uppercase tracking-wider text-itera-muted')}>
      {showGrip && <span />}
      <span>Card</span>
      <span>Type</span>
      <span>Status</span>
      <span>Due</span>
      <span />
    </div>
  )
}

function TypeCell({ kind, type }: { kind: 'v1' | 'v2'; type: string }) {
  const visual = rowVisualFor({ kind, type })
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
// kinds, toggled from the overflow menu's "Move" item (same UX CardRowV2
// established) rather than a separate always-visible icon button.
function MovePopover({
  decks,
  currentDeckId,
  onMove,
  onClose,
}: {
  decks: FlatDeck[]
  currentDeckId: string
  onMove: (deckId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const others = decks.filter((d) => d.deck.id !== currentDeckId)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-20 mt-1 w-56 rounded-itera-control border border-itera-border bg-itera-surface py-1 shadow-[var(--itera-shadow-float)]"
    >
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
    </div>
  )
}

// The v1-Card table row: type tile, title (+tags), Type/Status/Due columns,
// and a single overflow menu (Preview/Move/Suspend/Delete — Edit is the
// row's own click target, matching the target mockup's "no exposed row
// icons" instruction). `leading`/`containerRef`/`style` let a parent
// (drag-reorder mode) make the row sortable, same contract the old CardRow
// exposed.
export function CardTableRowV1({
  card,
  decks,
  onToggleSuspend,
  onDelete,
  onMove,
  leading,
  containerRef,
  style,
  now,
  compact = false,
  showGrip = false,
}: {
  card: Card
  decks: FlatDeck[]
  onToggleSuspend: (card: Card) => void
  onDelete: (card: Card) => void
  onMove: (card: Card, deckId: string) => void
  leading?: ReactNode
  containerRef?: Ref<HTMLDivElement>
  style?: CSSProperties
  now: number
  compact?: boolean
  showGrip?: boolean
}) {
  const navigate = useNavigate()
  const [showMove, setShowMove] = useState(false)
  const visual = rowVisualFor({ kind: 'v1', type: card.type })
  const Icon = visual.icon

  const items: OverflowMenuItem[] = [
    { label: 'Preview', icon: BookOpen, onClick: () => navigate(`/preview?card=${card.id}&from=/decks`) },
    { label: 'Move', icon: FolderInput, onClick: () => setShowMove((v) => !v) },
    {
      label: card.suspended ? 'Unsuspend' : 'Suspend',
      icon: card.suspended ? Eye : EyeOff,
      onClick: () => onToggleSuspend(card),
    },
    { label: 'Delete', icon: Trash2, onClick: () => onDelete(card), danger: true },
  ]

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(gridClass(showGrip), 'px-1', compact ? 'py-2' : 'py-4', card.suspended && 'opacity-55')}
    >
      {showGrip && leading}
      <Link to={`/cards/${card.id}/edit`} className="flex min-w-0 items-center gap-3 hover:text-itera-accent">
        <div className={cn('grid h-8 w-8 flex-none place-items-center rounded-itera-control text-white', visual.tileClass)}>
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-itera-ink-brand">
            {getCardTitle(card)}
            {card.suspended && (
              <span className="ml-2 rounded bg-itera-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase text-itera-muted">
                Suspended
              </span>
            )}
          </div>
          {!compact && card.tags.length > 0 && (
            <div className="mt-0.5 flex gap-1.5">
              {card.tags.map((tag) => (
                <span key={tag} className="rounded-itera-control bg-itera-surface-subtle px-1.5 py-0.5 text-[11px] text-itera-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <TypeCell kind="v1" type={card.type} />
      <StatusBadge state={card.scheduling.state} suspended={card.suspended} />
      <span className="text-sm text-itera-muted">{formatDue(card.scheduling.due, now)}</span>
      <div className="relative flex-none justify-self-end">
        <OverflowMenu items={items} ariaLabel="Card actions" />
        {showMove && (
          <MovePopover
            decks={decks}
            currentDeckId={card.deckId}
            onMove={(deckId) => {
              onMove(card, deckId)
              setShowMove(false)
            }}
            onClose={() => setShowMove(false)}
          />
        )}
      </div>
    </div>
  )
}

// The v2-CardV2Record table row — same shape as CardTableRowV1 but v2's own
// mutations (self-contained, matching how CardRowV2 already worked) and an
// extra Duplicate action. Never drag-sortable (v2 has no manual order UI
// yet), so it never reserves the grip column.
export function CardTableRowV2({
  card,
  decks,
  now,
  compact = false,
  showGrip = false,
}: {
  card: CardV2Record
  decks: FlatDeck[]
  now: number
  compact?: boolean
  showGrip?: boolean
}) {
  const navigate = useNavigate()
  const saveCard = useSaveCardV2()
  const deleteCard = useDeleteCardV2()
  const createCard = useCreateCardV2()
  const [showMove, setShowMove] = useState(false)
  const visual = rowVisualFor({ kind: 'v2', type: card.interaction.type })
  const Icon = visual.icon
  const title = card.prompt.value.split('\n')[0]?.trim() || '(untitled)'

  function toggleSuspend() {
    saveCard.mutate({ ...card, suspended: !card.suspended })
  }
  function remove() {
    if (window.confirm(`Delete this card?\n\n"${title}"`)) deleteCard.mutate(card.id)
  }
  function duplicate() {
    createCard.mutate(
      createCardV2({
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
    { label: 'Preview', icon: BookOpen, onClick: () => navigate(`/cards/${card.id}/study`) },
    { label: 'Duplicate', icon: Copy, onClick: duplicate },
    { label: 'Move', icon: FolderInput, onClick: () => setShowMove((v) => !v) },
    { label: card.suspended ? 'Unsuspend' : 'Suspend', icon: card.suspended ? Eye : EyeOff, onClick: toggleSuspend },
    { label: 'Delete', icon: Trash2, onClick: remove, danger: true },
  ]

  return (
    <div className={cn(gridClass(showGrip), 'px-1', compact ? 'py-2' : 'py-3', card.suspended && 'opacity-55')}>
      {showGrip && <span />}
      <Link to={`/cards/${card.id}/edit`} className="flex min-w-0 items-center gap-3 hover:text-itera-accent">
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
      <TypeCell kind="v2" type={card.interaction.type} />
      <StatusBadge state={card.scheduling.state} suspended={card.suspended} />
      <span className="text-sm text-itera-muted">{formatDue(card.scheduling.due, now)}</span>
      <div className="relative flex-none justify-self-end">
        <OverflowMenu items={items} ariaLabel="Card actions" />
        {showMove && (
          <MovePopover decks={decks} currentDeckId={card.deckId} onMove={moveTo} onClose={() => setShowMove(false)} />
        )}
      </div>
    </div>
  )
}
