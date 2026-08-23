import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { Card } from '@/types/card'
import { validateMultipleChoiceForm, type MultipleChoiceFormState } from '@/domain/cards/multipleChoiceForm'
import { useSaveMultipleChoiceCard, type SaveMultipleChoiceCardTarget } from '@/hooks/useCards'
import { MultipleChoiceFields } from './MultipleChoiceFields'
import { MultipleChoiceLivePreview } from './MultipleChoiceLivePreview'
import { CardEditorShell } from './CardEditorShell'
import { CardOrganizeFields } from './CardOrganizeFields'
import { editorSubtitle } from './shared/editorSubtitle'

// The Create/Edit shell for Multiple Choice, built on the shared
// CardEditorShell (header/Organize/layout block previously duplicated per
// type — see docs/itera-decisions.md D71/D74/D75/D76/D78 for why that
// extraction was deferred until now).
export function MultipleChoiceEditorShell({
  mode,
  initialForm,
  target,
  backTo,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialForm: MultipleChoiceFormState
  target: SaveMultipleChoiceCardTarget
  backTo: string
  onSaved: (record: Card) => void
}) {
  const navigate = useNavigate()
  const { data: decks } = useDecks()
  const [form, setForm] = useState(initialForm)
  const saveMultipleChoice = useSaveMultipleChoiceCard()

  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? []))
  const canSave = validateMultipleChoiceForm(form).canSave

  async function handleSave() {
    const record = await saveMultipleChoice.mutateAsync({ form, target })
    onSaved(record)
  }

  const editorPane = (
    <>
      <section className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-itera-ink-brand">2. Card content</h2>
        <MultipleChoiceFields form={form} onChange={setForm} />
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
      subtitle={editorSubtitle('multiple_choice', flatDecks, form.deckId)}
      prompt={form.prompt}
      onCancel={() => navigate(backTo)}
      onSave={handleSave}
      canSave={canSave}
      isSaving={saveMultipleChoice.isPending}
      editorPane={editorPane}
      previewPane={<MultipleChoiceLivePreview form={form} />}
    />
  )
}
