import { iteraColors, iteraRadii } from '@itera/core'
import { useState } from 'react'
import { StyleSheet, TextInput, type ReturnKeyTypeOptions } from 'react-native'

// The authoring text input.
//
// Card content is data, never markup, and is preserved byte for byte - which on
// a phone means the keyboard itself must not rewrite it. Autocorrect is off
// (that is also what disables iOS smart punctuation, which would turn a typed
// `"` into a curly quote inside a code snippet), autocapitalisation is off so
// `snake_case` and `std::vector` survive the first character, and spellcheck is
// off so `Vec<T>` is not underlined as a mistake. `textContentType: 'none'`
// keeps iOS from offering to fill a field with a name or an address.
export function FormTextInput({
  value,
  onChangeText,
  labelId,
  placeholder,
  multiline = false,
  minHeight,
  returnKeyType,
  onSubmitEditing,
  testID,
}: {
  value: string
  onChangeText: (text: string) => void
  labelId: string
  placeholder?: string
  multiline?: boolean
  minHeight?: number
  returnKeyType?: ReturnKeyTypeOptions
  onSubmitEditing?: () => void
  testID?: string
}) {
  const [focused, setFocused] = useState(false)

  return (
    <TextInput
      accessibilityLabelledBy={labelId}
      autoCapitalize="none"
      autoCorrect={false}
      multiline={multiline}
      onBlur={() => setFocused(false)}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={iteraColors.mutedLight}
      returnKeyType={returnKeyType ?? (multiline ? 'default' : 'done')}
      spellCheck={false}
      style={[
        styles.input,
        multiline && styles.multiline,
        minHeight !== undefined && { minHeight },
        focused && styles.focused,
      ]}
      testID={testID}
      textAlignVertical={multiline ? 'top' : 'center'}
      textContentType="none"
      value={value}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    color: iteraColors.ink,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },
  multiline: {
    minHeight: 92,
  },
  focused: {
    borderColor: iteraColors.accent,
  },
})
