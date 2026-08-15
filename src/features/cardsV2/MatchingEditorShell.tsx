import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { CardV2Record } from '@/types/cardV2'
import { validateMatchingForm, type MatchingFormState } from '@/domain/cardsV2/matchingForm'
import { useSaveMatchingCard, type SaveMatchingCardTarget } from '@/hooks/useCardsV2'
import { MatchingFields } from './MatchingFields'
import { MatchingLivePreview } from './MatchingLivePreview'
import { CardEditorShell } from './CardEditorShell'
import { CardOrganizeFields } from './CardOrganizeFields'
import { editorSubtitle } from './shared/editorSubtitle'

// The Create/Edit shell for Matching, built on the shared CardEditorShell
// (header/Organize/layout block previously duplicated per type — see
// docs/itera-decisions.md D71/D74/D75/D76/D78 for why that extraction was
// deferred until now).
export function MatchingEditorShell({
  mode,
  initialForm,
  target,
  backTo,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialForm: MatchingFormState
  target: SaveMatchingCardTarget
  backTo: string
  onSaved: (record: CardV2Record) => void
}) {
  const navigate = useNavigate()
  const { data: decks } = useDecks()
  const [form, setForm] = useState(initialForm)
  const saveMatching = useSaveMatchingCard()

  const flatDecks = flattenDeckTree(buildDeckTree(decks ?? []))
  const canSave = validateMatchingForm(form).canSave

  async function handleSave() {
    const record = await saveMatching.mutateAsync({ form, target })
    onSaved(record)
  }

  const editorPane = (
    <>
      <section className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-itera-ink-brand">2. Card content</h2>
        <MatchingFields form={form} onChange={setForm} />
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
      subtitle={editorSubtitle('matching', flatDecks, form.deckId)}
      prompt={form.prompt}
      onCancel={() => navigate(backTo)}
      onSave={handleSave}
      canSave={canSave}
      isSaving={saveMatching.isPending}
      editorPane={editorPane}
      previewPane={<MatchingLivePreview form={form} />}
    />
  )
}
