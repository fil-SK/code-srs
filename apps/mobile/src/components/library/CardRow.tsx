import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import type { MobileDeckCardViewModel } from '@/src/types/library'
import { interactionVisuals, statusColors } from './cardVisuals'

// The row opens the card it names, by its own canonical id, and its trailing
// control opens that card's actions.
//
// The two are deliberately separate targets and the row's tap is never
// ambiguous: tapping the row is always Study, and management is always the
// explicit control. An earlier decorative kebab glyph sat here and did nothing;
// this replaces it with a real 44-point button whose every listed item works.
//
// Lifted out of the deck screen when a Collection gained a section for the cards
// filed on the collection itself: the same card must not be drawn two ways.
export function CardRow({
  card,
  onOpen,
  onActions,
}: {
  card: MobileDeckCardViewModel
  onOpen: () => void
  onActions: () => void
}) {
  const visual = interactionVisuals[card.interactionType]
  return (
    <View style={styles.cardRowWrap}>
      <Pressable
        accessibilityHint="Opens a preview of this card"
        accessibilityLabel={`${card.prompt}, ${card.interactionLabel}, ${card.status}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.cardRow, pressed && styles.pressed]}
      >
        <View style={[styles.interactionMark, { backgroundColor: visual.backgroundColor }]}>
          <MaterialCommunityIcons color={iteraColors.surface} name={visual.icon} size={25} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.cardPrompt}>
            {card.prompt}
          </Text>
          <Text numberOfLines={1} style={styles.cardMeta}>
            {card.interactionLabel} · {card.tag}
          </Text>
        </View>
        <View style={styles.cardStatus}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[card.status] }]} />
          <Text style={styles.statusText}>{card.status}</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityHint="Edit or delete this card"
        accessibilityLabel={`Actions for ${card.prompt}`}
        accessibilityRole="button"
        hitSlop={4}
        onPress={onActions}
        style={({ pressed }) => [styles.cardActions, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={iteraColors.muted} name="dots-vertical" size={22} />
      </Pressable>
    </View>
  )
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: iteraColors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 10px rgba(30,41,59,0.05)' },
})

const styles = StyleSheet.create({
  cardRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: iteraColors.border,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingRight: 2,
    ...cardShadow,
  },
  cardActions: {
    width: 40,
    minHeight: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRow: {
    minWidth: 0,
    flex: 1,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 4,
  },
  interactionMark: {
    width: 46,
    height: 46,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: iteraRadii.control,
  },
  cardCopy: {
    minWidth: 0,
    flex: 1,
  },
  cardPrompt: {
    color: iteraColors.inkBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 4,
    color: iteraColors.muted,
    fontSize: 11,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: iteraColors.muted,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.65,
  },
})
