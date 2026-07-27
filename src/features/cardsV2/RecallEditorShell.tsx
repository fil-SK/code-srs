import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { CardV2Record } from '@/types/cardV2'
import type { RecallFormState } from '@/domain/cardsV2/recallForm'
import { useSaveRecallCard, type SaveRecallCardTarget } from '@/hooks/useCardsV2'
import { RecallFields } from './RecallFields'
import { RecallLivePreview } from './RecallLivePreview'
import { CardEditorShell } from './CardEditorShell'
import { editorSubtitle } from './shared/editorSubtitle'

// The shared Create/Edit shell (spec §22.3): editor pane, with the live
// Review preview available on demand via CardEditorShell's "Preview card"
// toggle rather than a permanent column (spec §29.3's Editor/Preview tabs
// still apply below the wide breakpoint). Only Recall is wired up this
// milestone — other interaction types will get their own *Fields/*LivePreview
// pair behind the same shell shape later.
export function RecallEditorShell({
  mode,
  initialForm,
  target,
  backTo,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialForm: RecallFormState
  target: SaveRecallCardTarget
  backTo: string
  onSaved: (record: CardV2Record) => void
}) {
  const navigate = useNavigate()
  const { data: decks } = useDecks()
  const [form, setForm] = useState(initialForm)
  const saveRecall = useSaveRecallCard()

  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? []))
  const canSave = form.prompt.trim().length > 0 && form.answer.trim().length > 0

  async function handleSave() {
    const record = await saveRecall.mutateAsync({ form, target })
    onSaved(record)
  }

  const editorPane = (
    <div className="space-y-4 rounded-itera-card border border-itera-border bg-itera-surface p-6">
      <RecallFields form={form} onChange={setForm} />

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

  return (
    <CardEditorShell
      mode={mode}
      subtitle={editorSubtitle('recall', flatDecks, form.deckId)}
      onCancel={() => navigate(backTo)}
      onSave={handleSave}
      canSave={canSave}
      isSaving={saveRecall.isPending}
      editorPane={editorPane}
      previewPane={<RecallLivePreview form={form} />}
    />
  )
}
