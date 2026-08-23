import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import { useDecks } from '@/hooks/useDecks'
import type { Card } from '@/types/card'
import { validateWalkthroughForm, type WalkthroughFormState } from '@/domain/cards/walkthroughForm'
import { useSaveWalkthroughCard, type SaveWalkthroughCardTarget } from '@/hooks/useCards'
import { WalkthroughFields } from './WalkthroughFields'
import { WalkthroughLivePreview } from './WalkthroughLivePreview'
import { CardEditorShell } from './CardEditorShell'
import { CardOrganizeFields } from './CardOrganizeFields'
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
  onSaved: (record: Card) => void
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
    <>
      <section className="p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-itera-ink-brand">2. Card content</h2>
        <WalkthroughFields form={form} onChange={setForm} />
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
      subtitle={editorSubtitle('walkthrough', flatDecks, form.deckId)}
      prompt={form.prompt}
      onCancel={() => navigate(backTo)}
      onSave={handleSave}
      canSave={canSave}
      isSaving={saveWalkthrough.isPending}
      editorPane={editorPane}
      previewPane={<WalkthroughLivePreview form={form} />}
    />
  )
}
