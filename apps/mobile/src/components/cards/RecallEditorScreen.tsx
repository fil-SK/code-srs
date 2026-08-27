import {
  cardRecordToForm,
  emptyRecallForm,
  useSaveRecallCard,
  validateRecallForm,
  type AuthoringPreset,
  type Card,
  type RecallFormState,
  type SaveRecallCardTarget,
} from '@itera/core'
import { useState } from 'react'

import { EditorScreen } from '@/src/components/ui/EditorScreen'
import { FormField } from '@/src/components/ui/FormField'
import { FormTextInput } from '@/src/components/ui/FormTextInput'
import { CardCommonFields, ChipRow } from './CardContentFields'

// Native Recall authoring, bound to the shared Recall form model.
//
// Every semantic decision on this screen is made in @itera/core and called from
// here: `emptyRecallForm` / `cardRecordToForm` shape the state,
// `validateRecallForm` decides whether Save is available, and
// `useSaveRecallCard` -> `saveRecallCard(repo, form, target)` performs the write.
// Nothing here mints an id, wraps a string in RichContent, stamps a timestamp or
// seeds a SchedulingState - that is exactly the duplication the shared save path
// exists to prevent, and it is why an edit keeps the card's identity, its
// suspended flag, its manual order and its entire scheduling state.
//
// Presets are authoring metadata (web's RecallFields says the same): they
// relabel nothing structural and never affect scheduling or how the card is
// reviewed.

const PRESETS: { value: AuthoringPreset; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'code_reading', label: 'Code reading' },
  { value: 'find_the_bug', label: 'Find the bug' },
  { value: 'predict_output', label: 'Predict output' },
  { value: 'explain_code', label: 'Explain code' },
]

export function RecallEditorScreen({
  deckId,
  card,
  deckName,
  onCancel,
  onSaved,
}: {
  deckId: string
  /** Present when editing; absent when creating. */
  card?: Card
  deckName: string
  onCancel: () => void
  onSaved: (record: Card) => void
}) {
  const save = useSaveRecallCard()
  const [touched, setTouched] = useState(false)
  const [form, setForm] = useState<RecallFormState>(() =>
    card ? cardRecordToForm(card) : emptyRecallForm(deckId),
  )

  const target: SaveRecallCardTarget = card ? { kind: 'existing', record: card } : { kind: 'new' }
  const validation = validateRecallForm(form)

  function patch(next: Partial<RecallFormState>) {
    setTouched(true)
    setForm((current) => ({ ...current, ...next }))
  }

  async function handleSave() {
    if (!validation.canSave) return
    const record = await save.mutateAsync({ form, target })
    onSaved(record)
  }

  return (
    <EditorScreen
      canSave={validation.canSave}
      errors={touched ? validation.errors : []}
      isSaving={save.isPending}
      onCancel={onCancel}
      onSave={handleSave}
      saveLabel={card ? 'Save card' : 'Create card'}
      subtitle={deckName}
      title={card ? 'Edit Recall card' : 'New Recall card'}
    >
      <FormField label="Preset" labelId="recall-preset-label">
        <ChipRow
          accessibilityPrefix="Recall preset"
          onChange={(authoringPreset) => patch({ authoringPreset })}
          options={PRESETS}
          value={form.authoringPreset}
        />
      </FormField>

      <FormField label="Prompt" labelId="recall-prompt-label">
        <FormTextInput
          labelId="recall-prompt-label"
          minHeight={104}
          multiline
          onChangeText={(prompt) => patch({ prompt })}
          placeholder="What is SSA form?"
          testID="recall-prompt-input"
          value={form.prompt}
        />
      </FormField>

      <FormField label="Answer" labelId="recall-answer-label">
        <FormTextInput
          labelId="recall-answer-label"
          minHeight={104}
          multiline
          onChangeText={(answer) => patch({ answer })}
          placeholder="Static Single Assignment: each variable is assigned exactly once."
          testID="recall-answer-input"
          value={form.answer}
        />
      </FormField>

      <CardCommonFields
        explanation={form.explanation}
        onChange={patch}
        tags={form.tags}
        tip={form.tip}
      />
    </EditorScreen>
  )
}
