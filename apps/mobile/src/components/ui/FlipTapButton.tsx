import { fliptapColors, fliptapRadii } from '@fliptap/core'
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'

// The one button the authoring surfaces use.
//
// Three variants, because the product has exactly three kinds of action on
// these screens: the accent primary (Save, Create, Add Card - the Deck screen's
// Study Now already establishes this shape), a bordered secondary (Cancel), and
// a destructive one that carries its meaning in words as well as colour, since
// colour alone is not an accessible signal.
//
// Minimum height is 50 so every one of them clears the comfortable touch
// target, and the disabled state is announced through accessibilityState rather
// than being conveyed only by opacity.

export type FlipTapButtonVariant = 'primary' | 'secondary' | 'destructive'

export function FlipTapButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
  accessibilityLabel,
  style,
  testID,
}: {
  label: string
  onPress: () => void
  variant?: FlipTapButtonVariant
  disabled?: boolean
  accessibilityHint?: string
  accessibilityLabel?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      testID={testID}
    >
      <Text style={[styles.labelBase, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: fliptapRadii.control,
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: fliptapColors.accent,
  },
  secondary: {
    borderColor: fliptapColors.borderStrong,
    borderWidth: 1,
    backgroundColor: fliptapColors.surface,
  },
  destructive: {
    backgroundColor: fliptapColors.error,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  labelBase: {
    fontSize: 16,
    fontWeight: '700',
  },
})

const labelStyles = StyleSheet.create({
  primary: { color: fliptapColors.surface },
  secondary: { color: fliptapColors.inkBrand },
  destructive: { color: fliptapColors.surface },
})
