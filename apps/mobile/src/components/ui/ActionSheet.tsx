import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { ComponentProps } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

// A list of actions, as a native bottom sheet.
//
// Generalises the shape CardStatusSheet and SortSheet already established -
// React Native's own Modal, a dismissing backdrop, a grabber, rows at least 52
// points tall - because three authoring surfaces now need the same thing: the
// deck's actions, a card row's actions, and the card-type chooser. Built by
// hand for the same reason those two were: the repository does not add a
// dependency for a backdrop and a column of rows.
//
// Every item in it does something. A sheet is not where unavailable capability
// goes; an action that does not exist yet is simply not listed.

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export interface ActionSheetItem {
  label: string
  icon: IconName
  onPress: () => void
  danger?: boolean
  hint?: string
}

export function ActionSheet({
  visible,
  title,
  subtitle,
  items,
  onClose,
}: {
  visible: boolean
  title: string
  subtitle?: string
  items: ActionSheetItem[]
  onClose: () => void
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        accessibilityLabel="Close actions"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}

        {items.map((item) => (
          <Pressable
            key={item.label}
            accessibilityHint={item.hint}
            accessibilityLabel={item.label}
            accessibilityRole="button"
            onPress={() => {
              // Close first, so the sheet is gone before a push or a second
              // sheet opens on top of it.
              onClose()
              item.onPress()
            }}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              color={item.danger ? iteraColors.error : iteraColors.inkBrand}
              name={item.icon}
              size={21}
            />
            <Text style={[styles.optionText, item.danger && styles.optionTextDanger]}>
              {item.label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
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
    color: iteraColors.inkBrand,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 3,
    marginBottom: 4,
    color: iteraColors.muted,
    fontSize: 13,
  },
  option: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    color: iteraColors.inkBrand,
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextDanger: {
    color: iteraColors.error,
  },
  cancel: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderTopColor: iteraColors.border,
    borderTopWidth: 1,
  },
  cancelText: {
    color: iteraColors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.65,
  },
})
