import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  cardRecordToMultipleChoiceForm,
  emptyMultipleChoiceForm,
  iteraColors,
  iteraRadii,
  newId,
  useSaveMultipleChoiceCard,
  validateMultipleChoiceForm,
  type Card,
  type MultipleChoiceFormState,
  type SaveMultipleChoiceCardTarget,
} from '@itera/core'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { EditorScreen } from '@/src/components/ui/EditorScreen'
import { FormField } from '@/src/components/ui/FormField'
import { FormTextInput } from '@/src/components/ui/FormTextInput'
import { CardCommonFields } from './CardContentFields'
import { McOptionRow } from './McOptionRow'

// Native Multiple Choice authoring, bound to the shared MC form model.
//
// Same rule as the Recall editor: emptyMultipleChoiceForm /
// cardRecordToMultipleChoiceForm shape the state, validateMultipleChoiceForm
// decides Save, and useSaveMultipleChoiceCard -> saveMultipleChoiceCard(repo,
// form, target) writes. No grading logic appears here - the exact-set
// comparison lives in domain/grading/multipleChoice.ts and belongs to the
// Review session, not to the editor.
//
// Two option-list behaviours are reproduced from web because they are the form
// model's semantics rather than presentation: single-select makes correct
// exclusive, and switching multiple -> single trims to the first correct option
// in list order (a structural invariant, not an author omission - the shared
// validator refuses more than one correct answer in single mode).
//
// There is no drag-and-drop and no reorder control. Option order is authored
// order, the model carries a randomize flag for Review, and no grading
// semantics depend on the order, so a reorder affordance at 390 points would be
// motion for its own sake.

export function MultipleChoiceEditorScreen({
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
  const save = useSaveMultipleChoiceCard()
  const [touched, setTouched] = useState(false)
  const [form, setForm] = useState<MultipleChoiceFormState>(() =>
    card ? cardRecordToMultipleChoiceForm(card) : emptyMultipleChoiceForm(deckId),
  )

  const target: SaveMultipleChoiceCardTarget = card
    ? { kind: 'existing', record: card }
    : { kind: 'new' }
  const validation = validateMultipleChoiceForm(form)

  function patch(next: Partial<MultipleChoiceFormState>) {
    setTouched(true)
    setForm((current) => ({ ...current, ...next }))
  }

  function updateOptionText(id: string, text: string) {
    patch({ options: form.options.map((o) => (o.id === id ? { ...o, text } : o)) })
  }

  function toggleCorrect(id: string) {
    if (form.selectionMode === 'multiple') {
      patch({ options: form.options.map((o) => (o.id === id ? { ...o, correct: !o.correct } : o)) })
      return
    }
    patch({ options: form.options.map((o) => ({ ...o, correct: o.id === id })) })
  }

  function addOption() {
    patch({ options: [...form.options, { id: newId(), text: '', correct: false }] })
  }

  function removeOption(id: string) {
    patch({ options: form.options.filter((o) => o.id !== id) })
  }

  function setSelectionMode(mode: 'single' | 'multiple') {
    if (mode === 'single') {
      const firstCorrect = form.options.findIndex((o) => o.correct)
      patch({
        selectionMode: mode,
        options: form.options.map((o, i) => ({ ...o, correct: i === firstCorrect })),
      })
      return
    }
    patch({ selectionMode: mode })
  }

  const optionsLabel =
    form.selectionMode === 'multiple'
      ? 'Options (mark the correct ones)'
      : 'Options (mark the correct one)'

  return (
    <EditorScreen
      canSave={validation.canSave}
      errors={touched ? validation.errors : []}
      isSaving={save.isPending}
      onCancel={onCancel}
      onSave={async () => {
        if (!validation.canSave) return
        const record = await save.mutateAsync({ form, target })
        onSaved(record)
      }}
      saveLabel={card ? 'Save card' : 'Create card'}
      subtitle={deckName}
      title={card ? 'Edit Multiple Choice card' : 'New Multiple Choice card'}
    >
      <FormField label="Prompt" labelId="mc-prompt-label">
        <FormTextInput
          labelId="mc-prompt-label"
          minHeight={104}
          multiline
          onChangeText={(prompt) => patch({ prompt })}
          placeholder="Which of these is true about std::unique_ptr?"
          testID="mc-prompt-input"
          value={form.prompt}
        />
      </FormField>

      <ToggleRow
        checked={form.selectionMode === 'multiple'}
        label="Allow multiple correct answers"
        onToggle={() => setSelectionMode(form.selectionMode === 'multiple' ? 'single' : 'multiple')}
      />
      <ToggleRow
        checked={form.randomizeOptions}
        label="Randomize option order in Review"
        onToggle={() => patch({ randomizeOptions: !form.randomizeOptions })}
      />

      <FormField label={optionsLabel} labelId="mc-options-label">
        <View>
          {form.options.map((option, index) => (
            <McOptionRow
              key={option.id}
              canRemove={form.options.length > 2}
              index={index}
              onChangeText={(text) => updateOptionText(option.id, text)}
              onRemove={() => removeOption(option.id)}
              onToggleCorrect={() => toggleCorrect(option.id)}
              option={option}
              selectionMode={form.selectionMode}
            />
          ))}

          <Pressable
            accessibilityLabel="Add option"
            accessibilityRole="button"
            onPress={addOption}
            style={({ pressed }) => [styles.addOption, pressed && styles.pressed]}
            testID="mc-add-option"
          >
            <MaterialCommunityIcons color={iteraColors.accent} name="plus" size={19} />
            <Text style={styles.addOptionText}>Add option</Text>
          </Pressable>
        </View>
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

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? (
          <MaterialCommunityIcons color={iteraColors.surface} name="check" size={15} />
        ) : null}
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  toggleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.borderStrong,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
  },
  checkboxChecked: {
    borderColor: iteraColors.accent,
    backgroundColor: iteraColors.accent,
  },
  toggleLabel: {
    minWidth: 0,
    flex: 1,
    color: iteraColors.ink,
    fontSize: 14,
  },
  addOption: {
    minHeight: 48,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
    borderColor: iteraColors.accent,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.accentSofter,
    paddingHorizontal: 14,
  },
  addOptionText: {
    color: iteraColors.inkBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
})
