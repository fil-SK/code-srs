import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export function ReviewPreviewHeader({
  current,
  total,
  exitLabel,
  hint,
  hintIcon,
  onExit,
}: {
  current: number
  total: number
  exitLabel: string
  hint: string
  hintIcon: IconName
  onExit: () => void
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={exitLabel}
        accessibilityRole="button"
        hitSlop={6}
        onPress={onExit}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={iteraColors.inkBrand} name="chevron-left" size={29} />
      </Pressable>

      <View accessibilityLabel={`Card ${current} of ${total}`} style={styles.progressWrap}>
        <Text style={styles.progressLabel}>{current} of {total}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(current / total) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.hint}>
        <MaterialCommunityIcons color={iteraColors.muted} name={hintIcon} size={18} />
        <Text numberOfLines={2} style={styles.hintText}>{hint}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { minHeight: 86, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 46, height: 46, borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { position: 'absolute', left: '32%', right: '32%', alignItems: 'center', gap: 8 },
  progressLabel: { color: iteraColors.inkBrand, fontSize: 18, fontWeight: '700' },
  progressTrack: { width: '100%', height: 5, overflow: 'hidden', borderRadius: iteraRadii.pill, backgroundColor: iteraColors.border },
  progressFill: { height: '100%', borderRadius: iteraRadii.pill, backgroundColor: iteraColors.accent },
  hint: { width: 84, alignItems: 'center', gap: 2 },
  hintText: { color: iteraColors.muted, fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.68 },
})
