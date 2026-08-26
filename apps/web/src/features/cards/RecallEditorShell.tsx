import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { Card } from '@/types/card'
import { validateRecallForm, type RecallFormState } from '@/domain/cards/recallForm'
import { useSaveRecallCard, type SaveRecallCardTarget } from '@/hooks/useCards'
import { RecallFields } from './RecallFields'
import { RecallLivePreview } from './RecallLivePreview'
import { CardEditorShell } from './CardEditorShell'
import { CardOrganizeFields } from './CardOrganizeFields'
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
  onSaved: (record: Card) => void
}) {
  const navigate = useNavigate()
  const { data: decks } = useDecks()
  const [form, setForm] = useState(initialForm)
  const saveRecall = useSaveRecallCard()

  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? []))
  const canSave = validateRecallForm(form).canSave

  async function handleSave() {
    const record = await saveRecall.mutateAsync({ form, target })
    onSaved(record)
  }

  const editorPane = (
    <>
      <section className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-itera-ink-brand">2. Card content</h2>
        <RecallFields form={form} onChange={setForm} />
      </section>
      <CardOrganizeFields
        deckId={form.deckId}
        tags={form.tags}
        flatDecks={flatDecks}
        onDeckChange={(deckId) => setForm({ ...form, deckId })}
        onTagsChange={(tags) => setForm({ ...form, tags })}
      />
    </>
  )

  return (
    <CardEditorShell
      mode={mode}
      subtitle={editorSubtitle('recall', flatDecks, form.deckId)}
      prompt={form.prompt}
      onCancel={() => navigate(backTo)}
      onSave={handleSave}
      canSave={canSave}
      isSaving={saveRecall.isPending}
      editorPane={editorPane}
      previewPane={<RecallLivePreview form={form} />}
    />
  )
}
