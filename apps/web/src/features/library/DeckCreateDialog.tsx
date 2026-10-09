import { tourExample } from '@fliptap/core'
import { onboardingTour, useTourField } from '@/features/onboarding/tourStore'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_DECK_ICON,
  validateDeckForm,
  useCreateDeck,
  type DeckIconId,
  type ID,
} from '@fliptap/core'
import { useIsNarrowShell } from '@/components/layout/useIsNarrowShell'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { DeckIconPicker } from './shared/DeckIconPicker'

export interface DeckCreateDialogProps {
  parentId?: ID
  parentName?: string
  returnFocusTo: HTMLElement | null
  onClose: () => void
}

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), [tabindex="0"]'

// A real form follows the existing modal/bottom-sheet convention. The shared
// prompt dialog cannot carry an icon chooser or report a failed async save.
export function DeckCreateDialog({
  parentId,
  parentName,
  returnFocusTo,
  onClose,
}: DeckCreateDialogProps) {
  const create = useCreateDeck()
  const isNarrow = useIsNarrowShell()
  const panelRef = useRef<HTMLFormElement>(null)
  const opener = useRef(returnFocusTo)
  const [name, setName] = useState('')
  useTourField('deck-name', name, () => setName(tourExample.deckName))
  const [iconId, setIconId] = useState<DeckIconId>(DEFAULT_DECK_ICON)
  const canSave = validateDeckForm({ name, description: '', iconId }).canSave

  function close() {
    if (!create.isPending) onClose()
  }

  useEffect(() => {
    const panel = panelRef.current
    const focusTarget = opener.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel?.querySelector<HTMLInputElement>('input')?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      const active = document.activeElement
      if ((!active || active === document.body || panel?.contains(active)) && focusTarget?.isConnected) {
        focusTarget.focus()
      }
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!create.isPending) onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      const index = items.indexOf(document.activeElement as HTMLElement)
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      if (index === -1 || (!event.shiftKey && index === items.length - 1)) {
        event.preventDefault()
        items[0].focus()
      } else if (event.shiftKey && index === 0) {
        event.preventDefault()
        items[items.length - 1].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [create.isPending, onClose])

  return createPortal(
    <div
      className="fliptap-scope"
      role="dialog"
      aria-modal="true"
      aria-label="New deck"
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'transparent' }}
    >
      <div className="absolute inset-0 bg-[rgba(23,32,51,0.45)]" onClick={close} aria-hidden="true" />
      <div className={cn('pointer-events-none absolute inset-0 flex', isNarrow ? 'items-end' : 'items-center justify-center p-4')}>
        <form
          ref={panelRef}
          className={cn(
            'pointer-events-auto relative w-full overflow-y-auto border border-fliptap-border bg-fliptap-surface p-6 shadow-[var(--fliptap-shadow-float)]',
            isNarrow
              ? 'max-h-[90dvh] rounded-t-[20px] pb-[max(24px,env(safe-area-inset-bottom))]'
              : 'max-h-[calc(100dvh-2rem)] max-w-[520px] rounded-fliptap-dialog',
          )}
          onSubmit={(event) => {
            event.preventDefault()
            if (canSave && !create.isPending) {
              create.mutate({ name: name.trim(), parentId, iconId }, { onSuccess: (deck) => { onboardingTour.event({ type: 'deck-created', deckId: deck.id }); onClose() } })
            }
          }}
        >
          <h2 className="font-fliptap-display text-xl font-bold text-fliptap-ink-brand">New deck</h2>
          <p className="mt-1 text-sm text-fliptap-muted">
            {parentName ? `Create inside “${parentName}”.` : 'Give your next topic a name and an icon.'}
          </p>
          <fieldset disabled={create.isPending} className="mt-5 space-y-5">
            <Field label="Deck name" tourId="deck-name">
              <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Algorithms" />
            </Field>
            <DeckIconPicker value={iconId} onChange={setIconId} />
          </fieldset>
          {create.isError && <p role="alert" className="mt-4 text-sm text-fliptap-error">Could not create the deck. Please try again.</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" onClick={close} disabled={create.isPending}>Cancel</Button>
            <Button data-tour="deck-save" type="submit" variant="primary" disabled={!canSave || create.isPending}>{create.isPending ? 'Creating…' : 'Create deck'}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
