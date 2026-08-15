import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { CardV2Record } from '@/types/cardV2'
import { validateWriteCodeForm, type WriteCodeFormState } from '@/domain/cardsV2/writeCodeForm'
import { useSaveWriteCodeCard, type SaveWriteCodeCardTarget } from '@/hooks/useCardsV2'
import { WriteCodeFields } from './WriteCodeFields'
import { WriteCodeLivePreview } from './WriteCodeLivePreview'
import { CardEditorShell } from './CardEditorShell'
import { CardOrganizeFields } from './CardOrganizeFields'
import { editorSubtitle } from './shared/editorSubtitle'

// The Create/Edit shell for Write Code, built on the shared CardEditorShell
// (header/Organize/layout block previously duplicated per type — see
// docs/itera-decisions.md D71/D74/D75/D76/D78 for why that extraction was
// deferred until now).
export function WriteCodeEditorShell({
  mode,
  initialForm,
  target,
  backTo,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialForm: WriteCodeFormState
  target: SaveWriteCodeCardTarget
  backTo: string
  onSaved: (record: CardV2Record) => void
}) {
  const navigate = useNavigate()
  const { data: decks } = useDecks()
  const [form, setForm] = useState(initialForm)
  const saveWriteCode = useSaveWriteCodeCard()

  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? []))
  const canSave = validateWriteCodeForm(form).canSave

  async function handleSave() {
    const record = await saveWriteCode.mutateAsync({ form, target })
    onSaved(record)
  }

  const editorPane = (
    <>
      <section className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-itera-ink-brand">2. Card content</h2>
        <WriteCodeFields form={form} onChange={setForm} />
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
      subtitle={editorSubtitle('write_code', flatDecks, form.deckId)}
      prompt={form.prompt}
      onCancel={() => navigate(backTo)}
      onSave={handleSave}
      canSave={canSave}
      isSaving={saveWriteCode.isPending}
      editorPane={editorPane}
      previewPane={<WriteCodeLivePreview form={form} />}
    />
  )
}
