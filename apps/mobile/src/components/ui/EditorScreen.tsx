import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { IteraButton } from './IteraButton'

// The shell every authoring form renders inside.
//
// The pieces that are the same for all four of them, and that are easy to get
// wrong once each: a pinned Cancel/title/Save header so Save is reachable
// without scrolling to the bottom of a long form, a KeyboardAvoidingView so the
// keyboard never covers the field being typed into, keyboardShouldPersistTaps
// so the first tap on Save registers instead of only dismissing the keyboard,
// and enough bottom padding that the last field clears the software keyboard.
//
// The error list is rendered here rather than per form because every form gets
// its errors from the same place: the shared validator for its type. Presenting
// them is a platform choice; deciding them is not.
export function EditorScreen({
  title,
  subtitle,
  saveLabel,
  canSave,
  isSaving,
  errors,
  onCancel,
  onSave,
  children,
}: {
  title: string
  subtitle?: string
  saveLabel: string
  canSave: boolean
  isSaving: boolean
  errors: string[]
  onCancel: () => void
  onSave: () => void
  children: ReactNode
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onCancel}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color="#49658e" name="close" size={22} />
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.keyboardView}
      >
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}

          {errors.length > 0 ? (
            <View accessibilityLiveRegion="polite" style={styles.errors}>
              {errors.map((message) => (
                <Text key={message} style={styles.errorText}>
                  {message}
                </Text>
              ))}
            </View>
          ) : null}

          <IteraButton
            disabled={!canSave || isSaving}
            label={isSaving ? 'Saving…' : saveLabel}
            onPress={onSave}
            style={styles.save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: iteraColors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomColor: iteraColors.border,
    borderBottomWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancel: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cancelText: {
    color: '#445b7e',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitleWrap: {
    minWidth: 0,
    flex: 1,
  },
  headerTitle: {
    color: iteraColors.inkBrand,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  headerSubtitle: {
    marginTop: 2,
    color: iteraColors.muted,
    fontSize: 12,
    textAlign: 'right',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: 4,
    paddingHorizontal: 18,
    paddingBottom: 56,
  },
  errors: {
    gap: 4,
    marginTop: 18,
  },
  errorText: {
    color: iteraColors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  save: {
    marginTop: 22,
  },
  pressed: {
    opacity: 0.65,
  },
})
