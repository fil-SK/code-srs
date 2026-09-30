import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { fliptapColors, fliptapRadii, writeCodeBehavior } from '@fliptap/core'
import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native'

import { NativeCodeBlock } from '@/src/components/text/NativeCodeBlock'
import { monoFamily } from '@/src/components/text/monoFamily'
import { RichTextNative } from '@/src/components/text/RichTextNative'
import type { NativeInteractionViewProps } from '../types'

// Write Code. Nothing is executed and nothing is compiled: the answer is
// compared against the card's accepted answers under the card's own comparison
// settings, which is `writeCodeBehavior.autoGrade` and is called, never copied.
//
// The editor is a plain multiline TextInput per master plan D5a - CodeMirror is
// not available here and a WebView carrying it is an escape hatch, not a
// default. It deliberately does not colour code while typing.

function WriteCodeBadge({ submitted }: { submitted: boolean }) {
  return (
    <View style={[styles.badge, submitted && styles.badgeSubmitted]}>
      <MaterialCommunityIcons
        color={submitted ? fliptapColors.accent : fliptapColors.inkBrand}
        name={submitted ? 'check-decagram-outline' : 'code-tags'}
        size={22}
      />
      <Text style={[styles.badgeText, submitted && styles.badgeTextSubmitted]}>
        {submitted ? 'Results' : 'Write Code'}
      </Text>
    </View>
  )
}

export function WriteCodeView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
  responseReady,
}: NativeInteractionViewProps<'write_code'>) {
  const interaction = card.interaction
  const revealScale = useRef(new Animated.Value(1)).current
  const [reduceMotion, setReduceMotion] = useState(false)

  const code = (response as string | undefined) ?? interaction.starterCode
  const submitted = phase.kind !== 'presenting' && phase.kind !== 'submitting'
  const correct = submitted
    ? (writeCodeBehavior.autoGrade?.(interaction, code)?.correct ?? false)
    : null
  const lineCount = Math.max(1, code.split(/\r\n|\r|\n/).length)

  // Seed the response with the starter code once, so submitting without
  // editing anything still submits real content rather than undefined - and so
  // the host's readiness check sees it.
  useEffect(() => {
    if (response === undefined) setResponse(interaction.starterCode)
    // Mount-only: the session remounts this tree per card (key={card.id}).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  function submit() {
    if (!responseReady || submitted) return
    Keyboard.dismiss()
    onPrimaryAction()
    if (reduceMotion) return
    Animated.sequence([
      Animated.timing(revealScale, { toValue: 0.985, duration: 100, useNativeDriver: true }),
      Animated.timing(revealScale, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()
  }

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.card, { transform: [{ scale: revealScale }] }]}>
        <WriteCodeBadge submitted={submitted} />
        <RichTextNative style={styles.prompt} text={card.prompt.value} />
        <View style={styles.languagePill}>
          <Text style={styles.languageText}>{interaction.language}</Text>
        </View>

        <View style={[styles.editor, submitted && styles.editorSubmitted]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.lineNumbers}
          >
            {Array.from({ length: lineCount }, (_, index) => (
              <Text key={index} style={styles.editorLineNumber}>
                {index + 1}
              </Text>
            ))}
          </View>
          <TextInput
            accessibilityLabel={`${interaction.language} answer editor`}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitted}
            multiline
            onChangeText={setResponse}
            selectionColor={fliptapColors.accent}
            spellCheck={false}
            style={[
              styles.editorInput,
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as TextStyle),
            ]}
            textAlignVertical="top"
            value={code}
          />
        </View>

        {!submitted ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !responseReady }}
            disabled={!responseReady}
            onPress={submit}
            style={({ pressed }) => [
              styles.submit,
              !responseReady && styles.submitDisabled,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons color={fliptapColors.surface} name="send-outline" size={19} />
            <Text style={styles.submitText}>Submit answer</Text>
          </Pressable>
        ) : (
          <View style={[styles.result, correct ? styles.resultCorrect : styles.resultIncorrect]}>
            <MaterialCommunityIcons
              color={correct ? fliptapColors.success : fliptapColors.error}
              name={correct ? 'check-circle-outline' : 'close-circle-outline'}
              size={21}
            />
            <Text style={[styles.resultText, correct ? styles.correctText : styles.incorrectText]}>
              {correct ? 'Correct' : 'Incorrect'}
            </Text>
          </View>
        )}
      </Animated.View>

      {correct === false && (
        <View style={styles.expectedPanel}>
          <Text style={styles.expectedHeading}>Expected answer</Text>
          <NativeCodeBlock
            code={interaction.acceptedAnswers[0] ?? ''}
            language={interaction.language}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: fliptapColors.border,
    backgroundColor: fliptapColors.surface,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: fliptapColors.navy,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' },
    }),
  },
  badge: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: fliptapRadii.pill,
    backgroundColor: fliptapColors.surfaceSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeSubmitted: { backgroundColor: fliptapColors.accentSofter },
  badgeText: { color: fliptapColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextSubmitted: { color: fliptapColors.accentActive },
  prompt: {
    marginTop: 22,
    color: fliptapColors.inkBrand,
    fontSize: 24,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  languagePill: {
    minHeight: 34,
    marginTop: 15,
    paddingHorizontal: 14,
    borderRadius: fliptapRadii.pill,
    backgroundColor: fliptapColors.navySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageText: {
    color: fliptapColors.inkBrand,
    fontFamily: monoFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  editor: {
    alignSelf: 'stretch',
    minHeight: 158,
    marginTop: 22,
    overflow: 'hidden',
    borderRadius: fliptapRadii.card,
    borderWidth: 1,
    borderColor: fliptapColors.borderStrong,
    backgroundColor: fliptapColors.surfaceSubtle,
    paddingVertical: 13,
    flexDirection: 'row',
  },
  editorSubmitted: { backgroundColor: fliptapColors.surface },
  lineNumbers: { width: 34, paddingTop: 0, alignItems: 'center' },
  editorLineNumber: {
    height: 24,
    color: fliptapColors.muted,
    fontFamily: monoFamily,
    fontSize: 12,
    lineHeight: 24,
  },
  editorInput: {
    flex: 1,
    minHeight: 130,
    maxHeight: 220,
    borderWidth: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    color: fliptapColors.inkBrand,
    fontFamily: monoFamily,
    fontSize: 12,
    lineHeight: 24,
    outlineWidth: 0,
  },
  submit: {
    alignSelf: 'stretch',
    minHeight: 54,
    marginTop: 18,
    borderRadius: fliptapRadii.control,
    backgroundColor: fliptapColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitDisabled: { opacity: 0.38 },
  submitText: { color: fliptapColors.surface, fontSize: 17, fontWeight: '700' },
  result: {
    alignSelf: 'stretch',
    minHeight: 54,
    marginTop: 18,
    borderRadius: fliptapRadii.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resultCorrect: { backgroundColor: fliptapColors.successSoft },
  resultIncorrect: { backgroundColor: fliptapColors.errorSoft },
  resultText: { fontSize: 16, fontWeight: '800' },
  correctText: { color: fliptapColors.success },
  incorrectText: { color: fliptapColors.error },
  expectedPanel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: fliptapColors.border,
    backgroundColor: fliptapColors.surface,
    padding: 16,
  },
  expectedHeading: {
    marginBottom: 12,
    color: fliptapColors.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  pressed: { opacity: 0.72 },
})
