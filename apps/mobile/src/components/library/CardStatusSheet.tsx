import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { CARD_STATUS_OPTIONS, type CardStatusFilter } from './cardFiltering'

// The deck card list's status filter, as a native bottom sheet. The options and
// the predicate live in cardFiltering.ts; this file only presents them.
//
// Built from React Native's own Modal rather than a sheet library: the surface
// is four rows and a backdrop, and the repository does not add a dependency for
// what it can build by hand.

export function CardStatusSheet({
  visible,
  filter,
  onChange,
  onClose,
}: {
  visible: boolean
  filter: CardStatusFilter
  onChange: (filter: CardStatusFilter) => void
  onClose: () => void
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        accessibilityLabel="Close filter options"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Filter by status</Text>
        {CARD_STATUS_OPTIONS.map((option) => {
          const selected = option.value === filter
          return (
            <Pressable
              key={option.value}
              // An explicit label: "Learning" on its own is also what a card row
              // reads, and a screen reader should hear what pressing this does.
              accessibilityLabel={
                option.value === 'all' ? 'Show all cards' : 'Show ' + option.label + ' cards'
              }
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
