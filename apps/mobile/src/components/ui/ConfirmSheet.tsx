import { iteraColors, iteraRadii } from '@itera/core'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { IteraButton } from './IteraButton'

// Two shapes of the same surface, because destructive work needs both.
//
//   'confirm' - a destructive confirmation. Its title names the entity, and its
//               action reads "Delete <name>" rather than a bare "Delete", so
//               what is about to be removed is stated in words. Red is a
//               reinforcement here, never the only signal.
//
//   'alert'   - a refusal with a single acknowledgement. This is what a blocked
//               deck deletion shows, and it is the native counterpart of web's
//               dialogs.alert - the guard itself is the shared checkDeckDeletion
//               and neither platform decides the rule on its own.
export function ConfirmSheet({
  visible,
  kind = 'confirm',
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  visible: boolean
  kind?: 'confirm' | 'alert'
  title: string
  description: string
  confirmLabel?: string
  onConfirm?: () => void
  onClose: () => void
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={styles.dialogWrap} pointerEvents="box-none">
        <View accessibilityViewIsModal accessible={false} style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          {kind === 'confirm' ? (
            <View style={styles.actions}>
              <IteraButton
                label={confirmLabel ?? 'Delete'}
                onPress={() => {
                  onClose()
                  onConfirm?.()
                }}
                variant="destructive"
              />
              <IteraButton label="Cancel" onPress={onClose} variant="secondary" />
            </View>
          ) : (
            <View style={styles.actions}>
              <IteraButton label="OK" onPress={onClose} variant="secondary" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  dialogWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: iteraRadii.dialog,
    backgroundColor: iteraColors.surface,
    padding: 20,
  },
  title: {
    color: iteraColors.inkBrand,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 8,
    color: iteraColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 9,
    marginTop: 20,
  },
})
