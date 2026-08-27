import { iteraColors, iteraRadii } from '@itera/core'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { FormField } from '@/src/components/ui/FormField'
import { FormTextInput } from '@/src/components/ui/FormTextInput'

// The three fields every card carries regardless of its interaction: the two
// optional prose fields and the tag list. Shared by both editors so neither
// restates the tag convention (a comma-separated string, parsed by the shared
// form model - the same convention web uses).
export function CardCommonFields({
  tip,
  explanation,
  tags,
  onChange,
}: {
  tip: string
  explanation: string
  tags: string
  onChange: (patch: { tip?: string; explanation?: string; tags?: string }) => void
}) {
  return (
    <>
      <FormField label="Tip" labelId="card-tip-label" optional>
        <FormTextInput
          labelId="card-tip-label"
          minHeight={72}
          multiline
          onChangeText={(value) => onChange({ tip: value })}
          placeholder="A short hint, shown before the answer…"
          testID="card-tip-input"
          value={tip}
        />
      </FormField>

      <FormField label="Explanation" labelId="card-explanation-label" optional>
        <FormTextInput
          labelId="card-explanation-label"
          minHeight={72}
          multiline
          onChangeText={(value) => onChange({ explanation: value })}
          placeholder="Why the answer is correct, or extra context…"
          testID="card-explanation-input"
          value={explanation}
        />
      </FormField>

      <FormField
        hint="Separate tags with commas."
        label="Tags"
        labelId="card-tags-label"
        optional
      >
        <FormTextInput
          labelId="card-tags-label"
          onChangeText={(value) => onChange({ tags: value })}
          placeholder="pointers, ownership"
          testID="card-tags-input"
          value={tags}
        />
      </FormField>
    </>
  )
}

// A row of mutually exclusive chips. Used for the Recall presets, which are
// authoring metadata only: switching one relabels nothing and changes neither
// the form's shape nor how the card is scheduled or reviewed.
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  accessibilityPrefix,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  accessibilityPrefix: string
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityLabel={`${accessibilityPrefix}: ${option.label}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 13,
  },
  chipSelected: {
    borderColor: iteraColors.accent,
    backgroundColor: iteraColors.accentSofter,
  },
  chipText: {
    color: iteraColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: iteraColors.inkBrand,
  },
  pressed: {
    opacity: 0.65,
  },
})
