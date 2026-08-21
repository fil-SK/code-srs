import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { Card, Deck, ID } from '@/types'
import { Button } from '@/components/ui/Button'
import { selectClass } from '@/components/ui/Field'
import { useIsNarrowShell } from '@/components/layout/useIsNarrowShell'
import { buildDeckTree, flattenDeckTree, subtreeIds } from '@/domain/decks/tree'
import { resolveSessionLimit } from '@/domain/stats/todayMetrics'
import { cn } from '@/lib/cn'

// The Today hero's second action, which had no behavior at all before this
// milestone. Scope + size only, and nothing is persisted: no StudySession
// entity, no stored preference, so a later plain "Start session" is the
// default queue again. The advanced controls sketched in docs/TODO.md
// (time-boxed sessions, weak cards, new vs. reviews, difficulty / interaction
// / tag filters, custom FSRS) are deliberately absent - none of them is
// prebuilt or abstracted for here.
//
// Its own dialog rather than a shared primitive: useDialogs() is
// confirm/prompt/alert and FloatingPanel carries role="menu" semantics, and
// neither fits a small form with validation. The structure (portal into
// document.body re-establishing .itera-scope, scrim, Escape, focus in and
// focus returned to the trigger) is copied from DialogHost and
// AccountMenuSheet so it behaves like every other overlay in the app -
// centered modal on desktop, bottom sheet below 480px.

type SizeChoice = 'all' | '10' | '20' | '30' | 'custom'

const SIZE_PRESETS: { value: SizeChoice; label: string }[] = [
  { value: 'all', label: 'All due' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '30', label: '30' },
  { value: 'custom', label: 'Custom' },
]

export interface AdjustSessionDialogProps {
  decks: Deck[]
  dueCards: Card[]
  onClose: () => void
  returnFocusTo?: HTMLElement | null
}

export function AdjustSessionDialog({
  decks,
  dueCards,
  onClose,
  returnFocusTo,
}: AdjustSessionDialogProps) {
  const navigate = useNavigate()
  const isNarrow = useIsNarrowShell()
  const panelRef = useRef<HTMLDivElement>(null)
  const scopeId = useId()

  const [deckId, setDeckId] = useState<ID | 'all'>('all')
  const [size, setSize] = useState<SizeChoice>('all')
  const [custom, setCustom] = useState('')

  // Same subtree semantics as /review?deck=<id>, computed from the same
  // helper, so the count shown here is exactly what the session will contain.
  const dueInScope = useMemo(() => {
    if (deckId === 'all') return dueCards.length
    const ids = new Set(subtreeIds(decks, deckId))
    return dueCards.filter((c) => ids.has(c.deckId)).length
  }, [deckId, decks, dueCards])

  // Every deck, not just the leaves the Library browses: /review?deck= scopes
  // by subtree, so picking a parent is a meaningful choice ("study all of
  // Compilers"). Listed in tree order with its full path, so a nested deck is
  // never ambiguous, and each option's count above says exactly what it means.
  const selectableDecks = useMemo(() => flattenDeckTree(buildDeckTree(decks)), [decks])

  const requested =
    size === 'all' ? undefined : size === 'custom' ? resolveSessionLimit(custom) : Number(size)
  const customInvalid = size === 'custom' && custom.trim() !== '' && requested === undefined
  const customEmpty = size === 'custom' && custom.trim() === ''

  // Presets are never disabled; the session is capped and the summary says so.
  const effective = requested === undefined ? dueInScope : Math.min(requested, dueInScope)
  const capped = requested !== undefined && requested > dueInScope
  const canStart = dueInScope > 0 && !customInvalid && !customEmpty

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const returnFocusRef = useRef(returnFocusTo)
  returnFocusRef.current = returnFocusTo

  useEffect(() => {
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>('input, select, button')?.focus()
    return () => {
      const active = document.activeElement
      if (active && active !== document.body && !panel?.contains(active)) return
      returnFocusRef.current?.focus()
    }
  }, [])

  function start() {
    if (!canStart) return
    const params = new URLSearchParams()
    if (deckId !== 'all') params.set('deck', deckId)
    if (requested !== undefined) params.set('limit', String(requested))
    const query = params.toString()
    navigate(query ? `/review?${query}` : '/review')
    onClose()
  }

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        start()
      }}
      className="p-6"
    >
      <h2 className="font-itera-display text-lg font-bold tracking-tight text-itera-ink-brand">
        Adjust session
      </h2>
      <p className="mt-1 text-sm text-itera-muted">
        Just for this session — nothing here is saved.
      </p>

      <fieldset className="mt-5">
        <legend className="mb-2 block text-xs font-semibold tracking-wide text-itera-muted uppercase">
          Scope
        </legend>
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 text-sm text-itera-ink">
            <input
              type="radio"
              name={`${scopeId}-scope`}
              checked={deckId === 'all'}
              onChange={() => setDeckId('all')}
              className="accent-itera-accent"
            />
            <span>All due cards</span>
            <span className="text-itera-muted">({dueCards.length})</span>
          </label>
          <label className="flex items-center gap-2.5 text-sm text-itera-ink">
            <input
              type="radio"
              name={`${scopeId}-scope`}
              checked={deckId !== 'all'}
              onChange={() => setDeckId(selectableDecks[0]?.deck.id ?? 'all')}
              disabled={selectableDecks.length === 0}
              className="accent-itera-accent"
            />
            <span>One deck</span>
          </label>
          {deckId !== 'all' && (
            <select
              aria-label="Deck"
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className={cn(selectClass, 'mt-1')}
            >
              {selectableDecks.map(({ deck, path }) => (
                <option key={deck.id} value={deck.id}>
                  {path}
                </option>
              ))}
            </select>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 block text-xs font-semibold tracking-wide text-itera-muted uppercase">
          Session size
        </legend>
        <div className="flex flex-wrap gap-2">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              aria-pressed={size === preset.value}
              onClick={() => setSize(preset.value)}
              className={cn(
                'cursor-pointer rounded-itera-control border px-3 py-1.5 text-sm font-medium transition-colors',
                size === preset.value
                  ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                  : 'border-itera-border text-itera-ink hover:border-itera-border-strong',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {size === 'custom' && (
          <div className="mt-3">
            <label
              htmlFor={`${scopeId}-custom`}
              className="mb-1.5 block text-xs font-medium text-itera-muted"
            >
              Number of cards
            </label>
            <input
              id={`${scopeId}-custom`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-invalid={customInvalid}
              aria-describedby={customInvalid ? `${scopeId}-custom-error` : undefined}
              className={cn(
                'w-28 rounded-[9px] border bg-code-bg px-3.5 py-2.5 text-sm text-text outline-none',
                customInvalid
                  ? 'border-itera-error focus:border-itera-error'
                  : 'border-border focus:border-accent',
              )}
            />
            {customInvalid && (
              <p id={`${scopeId}-custom-error`} className="mt-1.5 text-xs text-itera-error">
                Enter a whole number of cards, 1 or more.
              </p>
            )}
          </div>
        )}
      </fieldset>

      {/* Never states a count the Start button will not honor: an unusable
          custom value asks for one instead of quietly falling back to the
          whole queue. */}
      <p className="mt-5 text-sm text-itera-muted" role="status">
        {dueInScope === 0
          ? 'Nothing is due in this scope.'
          : customEmpty || customInvalid
            ? 'Enter how many cards to study.'
            : capped
              ? `Starts ${effective} ${effective === 1 ? 'card' : 'cards'} — that's everything due in this scope.`
              : `Starts ${effective} ${effective === 1 ? 'card' : 'cards'}.`}
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!canStart}>
          Start session
        </Button>
      </div>
    </form>
  )

  return createPortal(
    // document.body is outside `.itera-scope`, so the portal re-establishes the
    // token scope and cancels the canvas background that class paints.
    <div
      className="itera-scope"
      style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 80 }}
      role="dialog"
      aria-modal="true"
      aria-label="Adjust session"
    >
      <div
        className="absolute inset-0 bg-[rgba(23,32,51,0.45)]"
        onClick={onClose}
        aria-hidden="true"
      />
      {isNarrow ? (
        <div
          ref={panelRef}
          className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-itera-dialog border-t border-itera-border bg-itera-surface shadow-[var(--itera-shadow-float)]"
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-9 rounded-itera-pill bg-itera-border-strong"
          />
          {form}
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center overflow-auto p-4">
          <div
            ref={panelRef}
            className="relative w-full max-w-[440px] rounded-itera-dialog border border-itera-border bg-itera-surface shadow-[var(--itera-shadow-float)]"
          >
            {form}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
