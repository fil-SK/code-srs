import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { CardV2Record } from '@/types/cardV2'
import { validateWalkthroughForm, type WalkthroughFormState } from '@/domain/cardsV2/walkthroughForm'
import { useSaveWalkthroughCard, type SaveWalkthroughCardTarget } from '@/hooks/useCardsV2'
import { WalkthroughFields } from './WalkthroughFields'
import { WalkthroughLivePreview } from './WalkthroughLivePreview'
import { CardEditorShell } from './CardEditorShell'
import { editorSubtitle } from './shared/editorSubtitle'

// The Create/Edit shell for Walkthrough, built on the shared CardEditorShell
// (header/Organize/layout block previously duplicated per type — see
// docs/itera-decisions.md D71/D74/D75/D76/D78 for why that extraction was
// deferred until now).
export function WalkthroughEditorShell({
  mode,
  initialForm,
  target,
  backTo,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialForm: WalkthroughFormState
  target: SaveWalkthroughCardTarget
  backTo: string
  onSaved: (record: CardV2Record) => void
}) {
  const navigate = useNavigate()
  const { data: decks } = useDecks()
  const [form, setForm] = useState(initialForm)
  const saveWalkthrough = useSaveWalkthroughCard()

  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? []))
  const canSave = validateWalkthroughForm(form).canSave

  async function handleSave() {
    const record = await saveWalkthrough.mutateAsync({ form, target })
    onSaved(record)
  }

  const editorPane = (
    <div className="space-y-4 rounded-itera-card border border-itera-border bg-itera-surface p-6">
      <WalkthroughFields form={form} onChange={setForm} />

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
      subtitle={editorSubtitle('walkthrough', flatDecks, form.deckId)}
      onCancel={() => navigate(backTo)}
      onSave={handleSave}
      canSave={canSave}
      isSaving={saveWalkthrough.isPending}
      editorPane={editorPane}
      previewPane={<WalkthroughLivePreview form={form} />}
    />
  )
}
