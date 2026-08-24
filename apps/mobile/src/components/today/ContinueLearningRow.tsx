import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, markLabelFor } from '@itera/core'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import type { MobileTodayDeckViewModel } from '@/src/types/today'

interface ContinueLearningRowProps {
  deck: MobileTodayDeckViewModel
  onPress: () => void
}

export function ContinueLearningRow({ deck, onPress }: ContinueLearningRowProps) {
  return (
    <Pressable
      accessibilityHint="Opens the temporary Library destination"
      accessibilityLabel={`${deck.name}, ${deck.dueCount} due, ${deck.progressPercent}% progress`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.deckMark}>
        <Text style={styles.deckMarkLabel}>{markLabelFor(deck.name, 3)}</Text>
        <View style={styles.deckMarkRibbonMuted} />
        <View style={styles.deckMarkRibbonAccent} />
      </View>

      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>
          {deck.name}
        </Text>
        <Text numberOfLines={1} style={styles.description}>
          {deck.description}
        </Text>
        <View style={styles.progressRow}>
          <View
            accessibilityLabel={`${deck.name} progress`}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: deck.progressPercent }}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${deck.progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{deck.progressPercent}%</Text>
        </View>
      </View>

      <View style={styles.trailing}>
        <Text style={styles.due}>{deck.dueCount} due</Text>
        <MaterialCommunityIcons color={iteraColors.muted} name="chevron-right" size={21} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingVertical: 11,
    paddingLeft: 11,
    paddingRight: 9,
    ...Platform.select({
      ios: {
        shadowColor: iteraColors.navy,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 4px 10px rgba(30,41,59,0.05)' },
    }),
  },
  rowPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.995 }],
  },
  deckMark: {
    position: 'relative',
    width: 52,
    height: 52,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.navy,
  },
  deckMarkLabel: {
    zIndex: 2,
    color: iteraColors.surface,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 14,
    fontWeight: '700',
  },
  deckMarkRibbonMuted: {
    position: 'absolute',
    right: -20,
    bottom: -8,
    width: 62,
    height: 13,
    backgroundColor: 'rgba(148,163,184,0.5)',
    transform: [{ rotate: '-34deg' }],
  },
  deckMarkRibbonAccent: {
    position: 'absolute',
    right: -18,
    bottom: -1,
    width: 58,
    height: 5,
    backgroundColor: iteraColors.accent,
    transform: [{ rotate: '-34deg' }],
  },
  content: {
    minWidth: 0,
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  name: {
    minWidth: 0,
    color: iteraColors.inkBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  due: {
    flex: 1,
    color: iteraColors.accent,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'right',
  },
  trailing: {
    width: 72,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  description: {
    marginTop: 3,
    color: iteraColors.muted,
    fontSize: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 9,
  },
  progressTrack: {
    height: 5,
    flex: 1,
    overflow: 'hidden',
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.success,
  },
  progressText: {
    width: 31,
    color: '#475569',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    textAlign: 'right',
  },
})
