import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Deck } from '@/types'
import { Button } from '@/components/ui/Button'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useCreateDeck, useDeleteDeck, useDecks, useSaveDeck } from '@/hooks/useDecks'

export function DashboardPage() {
  const now = useMemo(() => Date.now(), [])
  const decks = useDecks()
  const allCards = useSearchCards({ includeSuspended: true })
  const dueCards = useDueCards({ now })

  const createDeck = useCreateDeck()
  const saveDeck = useSaveDeck()
  const deleteDeck = useDeleteDeck()

  // Per-deck totals and due counts, derived client-side.
  const counts = useMemo(() => {
    const total: Record<string, number> = {}
    const due: Record<string, number> = {}
    allCards.data?.forEach((c) => {
      total[c.deckId] = (total[c.deckId] ?? 0) + 1
    })
    dueCards.data?.forEach((c) => {
      due[c.deckId] = (due[c.deckId] ?? 0) + 1
    })
    return { total, due }
  }, [allCards.data, dueCards.data])

  function newDeck() {
    const name = window.prompt('New deck name')?.trim()
    if (name) createDeck.mutate({ name })
  }

  function rename(deck: Deck) {
    const name = window.prompt('Deck name', deck.name)?.trim()
    if (name && name !== deck.name) saveDeck.mutate({ ...deck, name })
  }

  function remove(deck: Deck) {
    const n = counts.total[deck.id] ?? 0
    if (n > 0) {
      window.alert(
        `“${deck.name}” has ${n} card${n === 1 ? '' : 's'}. Move or delete them before deleting the deck.`,
      )
      return
    }
    if (window.confirm(`Delete deck “${deck.name}”?`)) deleteDeck.mutate(deck.id)
  }

  const totalDue = dueCards.data?.length ?? 0
  const totalCards = allCards.data?.length ?? 0

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Due today" value={totalDue} hint="ready to review" />
        <Stat label="Cards" value={totalCards} hint="across all decks" />
        <Stat label="Decks" value={decks.data?.length ?? 0} hint="collections" />
      </div>

      {totalDue > 0 && (
        <Link to="/review" className="mt-4 inline-block">
          <Button variant="primary">Study {totalDue} due now</Button>
        </Link>
      )}

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
          Decks
        </h2>
        <Button variant="ghost" onClick={newDeck}>
          <Plus size={14} /> New deck
        </Button>
      </div>

      {decks.data?.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-panel p-8 text-center text-sm text-muted">
          No decks yet. Create one, or just make a card — an “Inbox” deck is
          created automatically.
        </p>
      ) : (
        <div className="space-y-2.5">
          {decks.data?.map((deck) => (
            <div
              key={deck.id}
              className="flex items-center gap-3 rounded-[11px] border border-border bg-panel px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{deck.name}</div>
                <div className="text-xs text-faint">
                  {counts.total[deck.id] ?? 0} cards
                  {(counts.due[deck.id] ?? 0) > 0 && (
                    <span className="text-accent"> · {counts.due[deck.id]} due</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => rename(deck)}
                title="Rename"
                aria-label="Rename deck"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-text"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => remove(deck)}
                title="Delete"
                aria-label="Delete deck"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red/10 hover:text-red"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-card border border-border bg-panel p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-faint">{hint}</div>
    </div>
  )
}
