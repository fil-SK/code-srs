import {
  useCreateDeck,
  useSaveDeck,
  validateDeckForm,
  type Deck,
  type DeckFormState,
} from '@itera/core'
import { useState } from 'react'

import { EditorScreen } from '@/src/components/ui/EditorScreen'
import { FormField } from '@/src/components/ui/FormField'
import { FormTextInput } from '@/src/components/ui/FormTextInput'

// Deck create and edit, as one screen in two modes.
//
// The form is name plus description: the two fields the mobile Library actually
// renders. Web's deck settings also expose a parent picker and a language, and
// this deliberately does not - a parent picker is Move Deck, which belongs to a
// later milestone, and the parent a new deck gets comes from where the create
// was launched instead. Nothing here can create or dissolve a Collection.
//
// Both modes write through the shared deck hooks. `useSaveDeck` receives the
// canonical Deck spread, so `id`, `createdAt`, `parentId` and `language` carry
// through an edit untouched; `useCreateDeck` mints the record. Validation is
// core's `validateDeckForm` - this screen renders its errors and gates Save on
// its `canSave`, and decides neither.

export type DeckFormTarget =
  | { kind: 'create'; parent?: Deck }
  | { kind: 'edit'; deck: Deck }

export function DeckFormScreen({
  target,
  onCancel,
  onSaved,
}: {
  target: DeckFormTarget
  onCancel: () => void
  onSaved: (deck: Deck) => void
}) {
  const createDeck = useCreateDeck()
  const saveDeck = useSaveDeck()

  const [form, setForm] = useState<DeckFormState>(() =>
    target.kind === 'edit'
      ? { name: target.deck.name, description: target.deck.description ?? '' }
      : { name: '', description: '' },
  )

  const validation = validateDeckForm(form)
  const isSaving = createDeck.isPending || saveDeck.isPending

  async function handleSave() {
    if (!validation.canSave) return
    const name = form.name.trim()
    const description = form.description.trim() || undefined

    if (target.kind === 'create') {
      const deck = await createDeck.mutateAsync({
        name,
        description,
        parentId: target.parent?.id,
      })
      onSaved(deck)
      return
    }

    const next: Deck = { ...target.deck, name, description }
    await saveDeck.mutateAsync(next)
    onSaved(next)
  }

  return (
    <EditorScreen
      canSave={validation.canSave}
      errors={form.name.length > 0 ? validation.errors : []}
      isSaving={isSaving}
      onCancel={onCancel}
      onSave={handleSave}
      saveLabel={target.kind === 'create' ? 'Create deck' : 'Save deck'}
      subtitle={
        target.kind === 'create' && target.parent ? `in ${target.parent.name}` : undefined
      }
      title={target.kind === 'create' ? 'New deck' : 'Edit deck'}
    >
      <FormField label="Name" labelId="deck-name-label">
        <FormTextInput
          labelId="deck-name-label"
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="e.g. Templates"
          returnKeyType="next"
          testID="deck-name-input"
          value={form.name}
        />
      </FormField>

      <FormField label="Description" labelId="deck-description-label" optional>
        <FormTextInput
          labelId="deck-description-label"
          minHeight={80}
          multiline
          onChangeText={(description) => setForm((current) => ({ ...current, description }))}
          placeholder="What this deck covers…"
          testID="deck-description-input"
          value={form.description}
        />
      </FormField>
    </EditorScreen>
  )
}
