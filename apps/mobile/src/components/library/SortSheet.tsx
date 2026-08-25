import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, type DeckSortKey } from '@itera/core'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { DECK_SORT_OPTIONS } from './deckSorting'

// The deck sort control, as a native bottom sheet.
//
// Built from React Native's own Modal rather than a sheet library: the whole
// surface is four rows and a backdrop, and the repository does not add a
// dependency for what it can build by hand. A desktop dropdown is deliberately
// not reproduced here.
//
// The four options and their meanings are web's, unchanged, because the
// ordering itself comes from the shared `sortDecks` in @itera/core. "Due soon"
// is web's label for most-due-first, not next-due-date; the wording is kept so
// the two platforms do not describe the same ordering differently.

export function SortSheet({
  visible,
  sort,
  onChange,
  onClose,
}: {
  visible: boolean
  sort: DeckSortKey
  onChange: (sort: DeckSortKey) => void
  onClose: () => void
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close sort options"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Sort decks</Text>
        {DECK_SORT_OPTIONS.map((option) => {
          const selected = option.value === sort
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(option.value)
                onClose()
              }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
              {selected ? (
                <MaterialCommunityIcons color={iteraColors.accent} name="check" size={21} />
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  sheet: {
    borderTopLeftRadius: iteraRadii.card,
    borderTopRightRadius: iteraRadii.card,
    backgroundColor: iteraColors.surface,
    paddingTop: 10,
    paddingBottom: 34,
    paddingHorizontal: 18,
  },
  grabber: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.border,
  },
  title: {
    marginTop: 14,
    marginBottom: 6,
    color: iteraColors.inkBrand,
    fontSize: 17,
    fontWeight: '700',
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    color: iteraColors.inkBrand,
    fontSize: 15,
  },
  optionTextSelected: {
    color: iteraColors.accent,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
})
