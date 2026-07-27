import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCreateDeck, useDecks } from '@/hooks/useDecks'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'

// Global "+Create" action (locked IA §3/§9): a deck picker, since the only
// thing to create today is a card, and every card belongs to a deck. Picking
// a deck (or creating a new one inline) navigates to the existing, untouched
// decks/:deckId/cards/new route — no card-interaction internals are touched
// by this milestone.
export function CreateMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const decksQuery = useDecks()
  const createDeck = useCreateDeck()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const flat = flattenDeckTree(buildDeckTree(decksQuery.data ?? []))

  function goToDeck(deckId: string) {
    setOpen(false)
    navigate(`/decks/${deckId}/cards/new`)
  }

  function handleNewDeck() {
    const name = window.prompt('New deck name')
    if (!name?.trim()) return
    createDeck.mutate(
      { name: name.trim() },
      { onSuccess: (deck) => goToDeck(deck.id) },
    )
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:brightness-105"
      >
        <Plus size={15} />
        Create
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-64 rounded-itera-control border border-itera-border bg-itera-surface p-1 shadow-[var(--itera-shadow-float)]"
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-itera-muted">New card in…</div>
          <ul className="max-h-72 overflow-auto">
            {flat.map(({ deck, path }) => (
              <li key={deck.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goToDeck(deck.id)}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-itera-ink hover:bg-itera-accent-soft"
                >
                  {path}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-itera-border pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleNewDeck}
              className="block w-full rounded px-2 py-1.5 text-left text-sm font-semibold text-itera-accent hover:bg-itera-accent-soft"
            >
              + New deck
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
