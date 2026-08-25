import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

// The immersive session header: exit, real position, and a per-phase hint.
//
// `current`/`total` were fabricated per fixture (every preview said "of 10").
// They are now the live queue index and length, so the bar is the session's
// actual progress.
//
// `progress` is optional because one surface honestly has none: studying a
// single card outside a session is not position 1 of 1 in anything, and drawing
// a full progress bar for it would assert a session that is not running. That
// surface passes a `badge` instead, and the two are mutually exclusive by
// construction rather than by convention.

export function ReviewSessionHeader({
  progress,
  badge,
  exitLabel,
  hint,
  hintIcon,
  onExit,
}: {
  progress?: { current: number; total: number }
  badge?: string
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

      {progress ? (
        <View
          accessibilityLabel={`Card ${progress.current} of ${progress.total}`}
          style={styles.progressWrap}
        >
          <Text style={styles.progressLabel}>
            {progress.current} of {progress.total}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` },
              ]}
            />
          </View>
        </View>
      ) : badge ? (
        <View style={styles.progressWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.hint}>
        <MaterialCommunityIcons color={iteraColors.muted} name={hintIcon} size={18} />
        <Text numberOfLines={2} style={styles.hintText}>
          {hint}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    minHeight: 86,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: { position: 'absolute', left: '32%', right: '32%', alignItems: 'center', gap: 8 },
  progressLabel: { color: iteraColors.inkBrand, fontSize: 18, fontWeight: '700' },
  progressTrack: {
    width: '100%',
    height: 5,
    overflow: 'hidden',
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.border,
  },
  progressFill: { height: '100%', borderRadius: iteraRadii.pill, backgroundColor: iteraColors.accent },
  badge: {
    minHeight: 28,
    justifyContent: 'center',
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.accentSofter,
    paddingHorizontal: 14,
  },
  badgeText: {
    color: iteraColors.inkBrand,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  hint: { width: 84, alignItems: 'center', gap: 2 },
  hintText: {
    color: iteraColors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: { opacity: 0.68 },
})
