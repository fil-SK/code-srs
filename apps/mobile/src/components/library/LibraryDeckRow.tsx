import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, markLabelFor } from '@itera/core'
import type { ComponentProps } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import type { MobileLibraryDeckViewModel } from '@/src/types/library'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

function DeckMetric({
  icon,
  label,
  accented = false,
}: {
  icon: IconName
  label: string
  accented?: boolean
}) {
  const color = accented ? iteraColors.accent : iteraColors.muted
  return (
    <View style={styles.metric}>
      <MaterialCommunityIcons color={color} name={icon} size={15} />
      <Text numberOfLines={1} style={[styles.metricText, accented && styles.metricTextAccent]}>
        {label}
      </Text>
    </View>
  )
}

export function LibraryDeckRow({
  deck,
  onPress,
}: {
  deck: MobileLibraryDeckViewModel
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityHint="Opens this deck"
      accessibilityLabel={`${deck.name}, ${deck.cardCount} cards, ${deck.dueCount} due, ${deck.progressPercent}% progress, last studied ${deck.lastStudiedLabel}`}
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
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {deck.name}
          </Text>
          <Text numberOfLines={1} style={styles.description}>
            {deck.description}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <DeckMetric icon="cards-outline" label={`${deck.cardCount} cards`} />
          <DeckMetric
            accented={deck.dueCount > 0}
            icon="bell-outline"
            label={`${deck.dueCount} due`}
          />
          <DeckMetric icon="calendar-blank-outline" label={deck.lastStudiedLabel} />
          <View style={styles.progressGroup}>
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
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingVertical: 12,
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
  },
  identity: {
    minWidth: 0,
    flex: 1,
  },
  name: {
    color: iteraColors.inkBrand,
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    marginTop: 3,
    color: iteraColors.muted,
    fontSize: 11,
  },
  summaryRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 11,
  },
  metric: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    color: iteraColors.muted,
    fontSize: 10,
  },
  metricTextAccent: {
    color: iteraColors.accent,
    fontWeight: '700',
  },
  progressGroup: {
    minWidth: 54,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    minWidth: 28,
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
    width: 28,
    color: iteraColors.inkBrand,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'right',
  },
})
