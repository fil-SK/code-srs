import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { fliptapColors, fliptapRadii, type DeckSortKey } from '@fliptap/core'
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
// ordering itself comes from the shared `sortDecks` in @fliptap/core. "Due soon"
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
                <MaterialCommunityIcons color={fliptapColors.accent} name="check" size={21} />
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
    borderTopLeftRadius: fliptapRadii.card,
    borderTopRightRadius: fliptapRadii.card,
    backgroundColor: fliptapColors.surface,
    paddingTop: 10,
    paddingBottom: 34,
    paddingHorizontal: 18,
  },
  grabber: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: fliptapRadii.pill,
    backgroundColor: fliptapColors.border,
  },
  title: {
    marginTop: 14,
    marginBottom: 6,
    color: fliptapColors.inkBrand,
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
    color: fliptapColors.inkBrand,
    fontSize: 15,
  },
  optionTextSelected: {
    color: fliptapColors.accent,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
})
