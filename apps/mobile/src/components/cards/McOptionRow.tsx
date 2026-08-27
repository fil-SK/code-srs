import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, type McOptionFormState } from '@itera/core'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { FormTextInput } from '@/src/components/ui/FormTextInput'

// One authorable Multiple Choice option: its text, whether it is correct, and a
// way to take it away.
//
// The correct-state control is a real toggle with a real accessible name - it
// says which option it marks, because "correct" repeated four times down a
// column tells a screen-reader user nothing. It is a radio in single-select and
// a checkbox in multi-select, matching what the shared model means by
// selectionMode, and it carries a check glyph as well as the accent colour so
// the state is not conveyed by colour alone.
//
// Remove is disabled, not hidden, at the two-option floor, so the control does
// not disappear under the finger mid-edit; the floor itself is the shared
// validator's rule (`Add at least 2 options.`), restated here only as a
// disabled state.
export function McOptionRow({
  option,
  index,
  selectionMode,
  canRemove,
  onChangeText,
  onToggleCorrect,
  onRemove,
}: {
  option: McOptionFormState
  index: number
  selectionMode: 'single' | 'multiple'
  canRemove: boolean
  onChangeText: (text: string) => void
  onToggleCorrect: () => void
  onRemove: () => void
}) {
  const position = index + 1
  const labelId = `mc-option-${option.id}`

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityHint="Marks this option as a correct answer"
        accessibilityLabel={`Option ${position} is correct`}
        accessibilityRole={selectionMode === 'single' ? 'radio' : 'checkbox'}
        accessibilityState={{ checked: option.correct }}
        hitSlop={6}
        onPress={onToggleCorrect}
        style={({ pressed }) => [
          styles.marker,
          selectionMode === 'single' ? styles.markerRound : styles.markerSquare,
          option.correct && styles.markerChecked,
          pressed && styles.pressed,
        ]}
      >
        {option.correct ? (
          <MaterialCommunityIcons color={iteraColors.surface} name="check" size={16} />
        ) : null}
      </Pressable>

      <View style={styles.inputWrap}>
        <Text nativeID={labelId} style={styles.hiddenLabel}>
          {`Option ${position}`}
        </Text>
        <FormTextInput
          labelId={labelId}
          onChangeText={onChangeText}
          placeholder={`Option ${position}`}
          testID={`mc-option-input-${index}`}
          value={option.text}
        />
      </View>

      <Pressable
        accessibilityLabel={`Remove option ${position}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canRemove }}
        disabled={!canRemove}
        hitSlop={6}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.remove,
          !canRemove && styles.removeDisabled,
          pressed && canRemove && styles.pressed,
        ]}
        testID={`mc-option-remove-${index}`}
      >
        <MaterialCommunityIcons color={iteraColors.muted} name="close" size={20} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 9,
  },
  marker: {
    width: 30,
    height: 30,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: iteraColors.borderStrong,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
  },
  markerRound: {
    borderRadius: 15,
  },
  markerSquare: {
    borderRadius: 7,
  },
  markerChecked: {
    borderColor: iteraColors.accent,
    backgroundColor: iteraColors.accent,
  },
  inputWrap: {
    minWidth: 0,
    flex: 1,
  },
  // Present for the accessibility tree, sized out of the layout. React Native
  // has no aria-hidden equivalent that keeps a nativeID addressable.
  hiddenLabel: {
    height: 0,
    color: 'transparent',
    fontSize: 1,
  },
  remove: {
    width: 40,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDisabled: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.65,
  },
})
