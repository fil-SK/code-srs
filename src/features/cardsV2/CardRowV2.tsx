import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Eye, EyeOff, FolderInput, Pencil, Trash2 } from 'lucide-react'
import type { CardV2Record } from '@/types/cardV2'
import { cn } from '@/lib/cn'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { createCardV2 } from '@/domain/cardsV2/factory'
import { useDecks } from '@/hooks/useDecks'
import { useCreateCardV2, useDeleteCardV2, useSaveCardV2 } from '@/hooks/useCardsV2'
import { InteractionTypeTile } from './shared/InteractionTypeBadge'
import { StatusBadge } from './shared/StatusBadge'
import { formatDue } from './shared/format'
import { OverflowMenu } from './shared/OverflowMenu'

function firstLine(text: string): string {
  const line = text.split('\n')[0].trim()
  return line || '(untitled)'
}

// A small deck-picker popover for "Move", in the same outside-click-to-close
// idiom as OverflowMenu — kept local since Move needs a list of decks rather
// than a flat action, unlike the other overflow items.
function MovePopover({
  currentDeckId,
  onMove,
  onClose,
}: {
  currentDeckId: string
  onMove: (deckId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { data: decks } = useDecks()
  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? [])).filter(
    (f) => f.deck.id !== currentDeckId,
  )

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
      {flatDecks.length === 0 ? (
        <div className="px-3 py-1.5 text-sm text-itera-muted">No other decks.</div>
      ) : (
        <ul className="max-h-64 overflow-auto">
          {flatDecks.map((f) => (
            <li key={f.deck.id}>
              <button
                type="button"
                onClick={() => onMove(f.deck.id)}
                className="block w-full truncate px-3 py-1.5 text-left text-sm text-itera-ink hover:bg-itera-surface-subtle"
              >
                {f.path}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// The compact Deck-page row for a CardV2Record (spec §14.4): interaction
// icon, title, up to two quiet tags, learning status, due, overflow — never a
// miniature flashcard, and the interaction type is only ever shown once
// (the tile), not repeated as a separate loud column. The row itself opens
// the Recall study preview (the fast, common path); Edit and management
// actions live inline on the row rather than behind an extra detail screen.
export function CardRowV2({ card, now }: { card: CardV2Record; now: number }) {
  const navigate = useNavigate()
  const saveCard = useSaveCardV2()
  const deleteCard = useDeleteCardV2()
  const createCard = useCreateCardV2()
  const [showMovePicker, setShowMovePicker] = useState(false)

  function toggleSuspend() {
    saveCard.mutate({ ...card, suspended: !card.suspended })
  }

  function remove() {
    if (window.confirm(`Delete this card?\n\n"${firstLine(card.prompt.value)}"`)) {
      deleteCard.mutate(card.id)
    }
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
    setShowMovePicker(false)
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-[10px] border border-itera-border bg-itera-surface pr-2',
        card.suspended && 'opacity-55',
      )}
    >
      <Link
        to={`/cards/${card.id}/study`}
        className="flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3 hover:text-itera-accent"
      >
        <InteractionTypeTile type={card.interaction.type} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-itera-ink-brand">
            {firstLine(card.prompt.value)}
          </div>
          {(card.tags.length > 0 || card.interaction.type === 'walkthrough') && (
            <div className="mt-0.5 flex items-center gap-1.5">
              {card.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-itera-control bg-itera-surface-subtle px-1.5 py-0.5 text-[11px] text-itera-muted"
                >
                  {tag}
                </span>
              ))}
              {card.interaction.type === 'walkthrough' && (
                <span className="text-[11px] text-itera-muted">
                  {card.interaction.steps.length} steps
                </span>
              )}
            </div>
          )}
        </div>
        <StatusBadge state={card.scheduling.state} suspended={card.suspended} />
        <span className="w-20 flex-none text-right text-xs text-itera-muted">
          {formatDue(card.scheduling.due, now)}
        </span>
      </Link>

      <button
        type="button"
        title="Edit"
        aria-label="Edit card"
        onClick={() => navigate(`/cards/${card.id}/edit`)}
        className="grid h-8 w-8 flex-none place-items-center rounded-itera-control text-itera-muted hover:bg-itera-surface-subtle hover:text-itera-ink"
      >
        <Pencil size={15} />
      </button>

      <div className="relative flex-none">
        <OverflowMenu
          items={[
            { label: 'Duplicate', icon: Copy, onClick: duplicate },
            { label: 'Move', icon: FolderInput, onClick: () => setShowMovePicker((v) => !v) },
            {
              label: card.suspended ? 'Unsuspend' : 'Suspend',
              icon: card.suspended ? Eye : EyeOff,
              onClick: toggleSuspend,
            },
            { label: 'Delete', icon: Trash2, onClick: remove, danger: true },
          ]}
        />
        {showMovePicker && (
          <MovePopover
            currentDeckId={card.deckId}
            onMove={moveTo}
            onClose={() => setShowMovePicker(false)}
          />
        )}
      </div>
    </div>
  )
}
