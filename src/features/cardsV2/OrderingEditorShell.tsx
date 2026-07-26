import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { CardV2Record } from '@/types/cardV2'
import { validateOrderingForm, type OrderingFormState } from '@/domain/cardsV2/orderingForm'
import { useSaveOrderingCard, type SaveOrderingCardTarget } from '@/hooks/useCardsV2'
import { OrderingFields } from './OrderingFields'
import { OrderingLivePreview } from './OrderingLivePreview'
import { useIsWideEditor } from './useIsWideEditor'
import { cn } from '@/lib/cn'

// The Create/Edit shell for Ordering, a fourth parallel shell alongside
// RecallEditorShell/MultipleChoiceEditorShell/WriteCodeEditorShell (see
// docs/itera-decisions.md D71 — duplicating the header/Organize/layout block
// again was the chosen approach over extracting a shared component, so the
// other three shells' own files stay untouched).
export function OrderingEditorShell({
  mode,
  initialForm,
  target,
  backTo,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialForm: OrderingFormState
  target: SaveOrderingCardTarget
  backTo: string
  onSaved: (record: CardV2Record) => void
}) {
  const navigate = useNavigate()
  const { data: decks } = useDecks()
  const [form, setForm] = useState(initialForm)
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')
  const isWide = useIsWideEditor()
  const saveOrdering = useSaveOrderingCard()

  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? []))
  const canSave = validateOrderingForm(form).canSave

  async function handleSave() {
    const record = await saveOrdering.mutateAsync({ form, target })
    onSaved(record)
  }

  const editorPane = (
    <div className="space-y-4 rounded-itera-card border border-itera-border bg-itera-surface p-6">
      <OrderingFields form={form} onChange={setForm} />

      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-itera-muted">
          3. Organize
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Deck">
            <select
              className={selectClass}
              value={form.deckId}
              onChange={(e) => setForm({ ...form, deckId: e.target.value })}
            >
              {flatDecks.map((f) => (
                <option key={f.deck.id} value={f.deck.id}>
                  {f.path}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags">
            <input
              className={fieldClass}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ssa, compilers"
            />
          </Field>
        </div>
      </div>
    </div>
  )

  const previewPane = <OrderingLivePreview form={form} />

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="text-xs text-itera-muted hover:text-itera-ink"
        >
          ← Cancel
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-itera-ink-brand">
          {mode === 'edit' ? 'Edit card' : 'New card'}
        </h1>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!canSave || saveOrdering.isPending}
        >
          {saveOrdering.isPending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Save card'}
        </Button>
      </div>

      {isWide ? (
        <div className="grid grid-cols-2 items-start gap-6">
          {editorPane}
          {previewPane}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex gap-1 rounded-itera-control border border-itera-border p-1">
            {(['editor', 'preview'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-[7px] py-1.5 text-sm font-semibold capitalize transition-colors',
                  tab === t ? 'bg-itera-accent-soft text-itera-ink-brand' : 'text-itera-muted',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'editor' ? editorPane : previewPane}
        </div>
      )}
    </div>
  )
}
