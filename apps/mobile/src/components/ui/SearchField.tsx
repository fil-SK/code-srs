import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { StyleProp, ViewStyle } from 'react-native'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'

// The one search box on this platform: a magnifier, a field, and a way out.
//
// All three Library searches had `clearButtonMode="while-editing"`, which is
// iOS-only - on Android there was no way to clear a query except to delete it
// one character at a time, and a filtered list with no visible way back to the
// unfiltered one reads as a broken screen rather than as an active filter. The
// button is drawn here instead of delegated to the platform, so every platform
// has it, it is a real 44-point target, and it is announced.
//
// It renders only when there is something to clear: an always-present X beside
// an empty field is a control that does nothing.
export function SearchField({
  accessibilityLabel,
  clearAccessibilityLabel,
  onChangeText,
  placeholder,
  style,
  value,
}: {
  accessibilityLabel: string
  /** What clearing this particular field means, e.g. "Clear deck search". */
  clearAccessibilityLabel: string
  onChangeText: (value: string) => void
  placeholder: string
  style?: StyleProp<ViewStyle>
  value: string
}) {
  return (
    <View style={[styles.wrap, style]}>
      <MaterialCommunityIcons color={iteraColors.mutedLight} name="magnify" size={23} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iteraColors.mutedLight}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel={clearAccessibilityLabel}
          accessibilityRole="button"
          // The glyph is 20 points, because a 44-point grey disc inside a
          // 52-point field is a blot; hitSlop makes the target 44 anyway.
          hitSlop={12}
          onPress={() => onChangeText('')}
          style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
        >
          <MaterialCommunityIcons color={iteraColors.surface} name="close" size={14} />
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: iteraColors.borderStrong,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 14,
  },
  input: {
    minWidth: 0,
    flex: 1,
    color: iteraColors.inkBrand,
    fontSize: 15,
    paddingVertical: 0,
  },
  clear: {
    width: 20,
    height: 20,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: iteraColors.mutedLight,
  },
  clearPressed: {
    opacity: 0.6,
  },
})
