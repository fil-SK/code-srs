import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// The shell every authoring form renders inside.
//
// The pieces that are the same for all four of them, and that are easy to get
// wrong once each: a pinned Cancel/Save header so Save is reachable without
// scrolling past the whole form, a KeyboardAvoidingView so the keyboard never
// covers the field being typed into, keyboardShouldPersistTaps so the first tap
// on Save registers instead of only dismissing the keyboard, and enough bottom
// padding that the last field clears the software keyboard.
//
// Save is in the header rather than at the end of the scroll because the
// longest form on this platform is a Multiple Choice card with six options, a
// tip, an explanation and tags: a Save below all of that is several screens
// away with the keyboard raised, on the one surface where the author has
// already finished and wants out. The header sits outside the
// KeyboardAvoidingView, so it stays visible whatever the keyboard is doing.
//
// The action row and the title are two rows, not one. A single row would have
// to shrink or truncate a title like "Edit Multiple Choice card" to fit between
// two controls at 390 points, and a title whose size depends on its neighbours
// is the failure D446 records.
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
  const saveDisabled = !canSave || isSaving

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
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

          <Pressable
            // The accessible name is the action, never the transient state, so
            // it does not change under a screen reader or a test mid-save.
            accessibilityLabel={saveLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled: saveDisabled }}
            disabled={saveDisabled}
            hitSlop={6}
            onPress={onSave}
            style={({ pressed }) => [
              styles.save,
              saveDisabled && styles.saveDisabled,
              pressed && !saveDisabled && styles.pressed,
            ]}
            testID="editor-save"
          >
            <Text style={styles.saveText}>{isSaving ? 'Saving…' : saveLabel}</Text>
          </Pressable>
        </View>

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
    borderBottomColor: iteraColors.border,
    borderBottomWidth: 1,
    backgroundColor: iteraColors.surface,
    paddingTop: 6,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  save: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.accent,
    paddingHorizontal: 18,
  },
  saveDisabled: {
    opacity: 0.45,
  },
  saveText: {
    color: iteraColors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitleWrap: {
    minWidth: 0,
    marginTop: 8,
  },
  headerTitle: {
    color: iteraColors.inkBrand,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    color: iteraColors.muted,
    fontSize: 12,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingTop: 14,
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
  pressed: {
    opacity: 0.65,
  },
})
