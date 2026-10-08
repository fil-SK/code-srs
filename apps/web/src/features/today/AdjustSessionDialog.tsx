import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import type { Card, Deck, ID } from '@/types'
import { Button } from '@/components/ui/Button'
import { fieldClass, selectClass } from '@/components/ui/Field'
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
// document.body re-establishing .fliptap-scope, scrim, Escape, focus in and
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
      if (e.key !== 'Tab') return
      const controls = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
        ) ?? [],
      ).filter((control) => {
        if (control instanceof HTMLInputElement && control.type === 'radio') return control.checked
        return true
      })
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const returnFocusRef = useRef(returnFocusTo)
  returnFocusRef.current = returnFocusTo

  useEffect(() => {
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>('input:checked')?.focus()
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

  const focusClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fliptap-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fliptap-surface'
  const scopeRowClass =
    'flex min-h-14 cursor-pointer items-center gap-3 rounded-fliptap-control px-3.5 py-3 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-fliptap-accent'

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        start()
      }}
      className="flex max-h-[calc(85dvh-20px)] flex-col sm:max-h-[calc(100dvh-2rem)]"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-5">
        <div>
          <h2 className="font-fliptap-display text-2xl font-bold tracking-tight text-fliptap-ink-brand">
            Adjust session
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fliptap-muted">
            Choose what to review and how many cards.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close Adjust session"
          onClick={onClose}
          className={cn(
            'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-fliptap-control text-fliptap-muted hover:bg-fliptap-surface-subtle hover:text-fliptap-ink',
            focusClass,
          )}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 overflow-y-auto px-6 pb-6">
        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold text-fliptap-ink-brand">
            What to review
          </legend>
          <div className="space-y-1">
            <label
              className={cn(
                scopeRowClass,
                deckId === 'all'
                  ? 'bg-fliptap-surface-subtle text-fliptap-ink-brand'
                  : 'text-fliptap-ink hover:bg-fliptap-surface-subtle',
              )}
            >
              <input
                type="radio"
                name={scopeId + '-scope'}
                checked={deckId === 'all'}
                onChange={() => setDeckId('all')}
                className="size-4 shrink-0 accent-fliptap-accent"
              />
              <span className="flex-1 font-medium">All due cards</span>
              <span className="text-sm tabular-nums text-fliptap-muted">{dueCards.length}</span>
            </label>
            <label
              className={cn(
                scopeRowClass,
                deckId !== 'all'
                  ? 'bg-fliptap-surface-subtle text-fliptap-ink-brand'
                  : 'text-fliptap-ink hover:bg-fliptap-surface-subtle',
                selectableDecks.length === 0 && 'cursor-default opacity-50',
              )}
            >
              <input
                type="radio"
                name={scopeId + '-scope'}
                checked={deckId !== 'all'}
                onChange={() => setDeckId(selectableDecks[0]?.deck.id ?? 'all')}
                disabled={selectableDecks.length === 0}
                className="size-4 shrink-0 accent-fliptap-accent"
              />
              <span className="font-medium">Choose a deck</span>
            </label>
            {deckId !== 'all' && (
              <div className="pt-2">
                <select
                  aria-label="Deck"
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  className={cn(selectClass, 'min-h-11', focusClass)}
                >
                  {selectableDecks.map(({ deck, path }) => (
                    <option key={deck.id} value={deck.id}>
                      {path}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2.5 text-sm font-semibold text-fliptap-ink-brand">
            How many cards
          </legend>
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.3fr] gap-1 rounded-fliptap-control bg-fliptap-surface-subtle p-1">
            {SIZE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                aria-pressed={size === preset.value}
                onClick={() => setSize(preset.value)}
                className={cn(
                  'min-h-11 min-w-0 cursor-pointer rounded-fliptap-control border px-1 text-sm font-medium transition-colors',
                  focusClass,
                  size === preset.value
                    ? 'border-fliptap-border-strong bg-fliptap-surface text-fliptap-ink-brand shadow-sm'
                    : 'border-transparent text-fliptap-muted hover:bg-fliptap-surface hover:text-fliptap-ink',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {size === 'custom' && (
            <div className="mt-3">
              <label
                htmlFor={scopeId + '-custom'}
                className="mb-1.5 block text-sm font-medium text-fliptap-ink"
              >
                Number of cards
              </label>
              <input
                id={scopeId + '-custom'}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                aria-invalid={customInvalid}
                aria-describedby={customInvalid ? scopeId + '-custom-error' : undefined}
                className={cn(
                  fieldClass,
                  'min-h-11',
                  focusClass,
                  customInvalid && 'border-fliptap-error focus:border-fliptap-error',
                )}
              />
              {customInvalid && (
                <p id={scopeId + '-custom-error'} className="mt-1.5 text-xs text-fliptap-error">
                  Enter a whole number of cards, 1 or more.
                </p>
              )}
            </div>
          )}
        </fieldset>

        {/* Invalid custom values must not advertise a count Start cannot honor. */}
        <div className="mt-6 rounded-fliptap-control bg-fliptap-surface-subtle px-4 py-4" role="status">
          <p className="text-base font-semibold text-fliptap-ink-brand">
            {dueInScope === 0
              ? 'Nothing is due in this scope.'
              : customEmpty || customInvalid
                ? 'Enter how many cards to study.'
                : String(effective) + (effective === 1 ? ' card' : ' cards') + ' ready to review'}
          </p>
          {canStart && (
            <p className="mt-1 text-sm leading-relaxed text-fliptap-muted">
              {capped
                ? 'Only ' + dueInScope + (dueInScope === 1 ? ' card is' : ' cards are') + ' due in this scope.'
                : deckId === 'all'
                  ? 'From across your decks.'
                  : 'From your selected deck and its subdecks.'}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-fliptap-border px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="mb-3 text-xs text-fliptap-muted">Applies to this session only.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className={cn('min-h-11', focusClass)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canStart} className={cn('min-h-11', focusClass)}>
            Start session
          </Button>
        </div>
      </div>
    </form>
  )
  return createPortal(
    // document.body is outside `.fliptap-scope`, so the portal re-establishes the
    // token scope and cancels the canvas background that class paints.
    <div
      className="fliptap-scope"
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
          className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-fliptap-dialog border-t border-fliptap-border bg-fliptap-surface shadow-[var(--fliptap-shadow-float)]"
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-9 rounded-fliptap-pill bg-fliptap-border-strong"
          />
          {form}
        </div>
      ) : (
        <div
          className="absolute inset-0 grid place-items-center overflow-auto p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <div
            ref={panelRef}
            className="relative w-full max-w-[460px] rounded-fliptap-dialog border border-fliptap-border bg-fliptap-surface shadow-[var(--fliptap-shadow-float)]"
          >
            {form}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
