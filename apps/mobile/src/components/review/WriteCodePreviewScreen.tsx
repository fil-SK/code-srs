import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii, writeCodeBehavior, type Rating } from '@itera/core'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PreviewRatingControls } from '@/src/components/review/PreviewRatingControls'
import { ReviewPreviewHeader } from '@/src/components/review/ReviewPreviewHeader'
import type {
  MobileWriteCodeCodeLine,
  MobileWriteCodePreviewViewModel,
  MobileWriteCodeTextPart,
} from '@/src/types/review'

const codeTone = {
  plain: iteraColors.inkBrand,
  type: '#168b55',
  keyword: '#9333a8',
  number: '#168b55',
  comment: iteraColors.muted,
  accent: iteraColors.accent,
} as const

function StructuredText({
  parts,
  textStyle,
}: {
  parts: MobileWriteCodeTextPart[]
  textStyle: TextStyle
}) {
  return (
    <Text style={textStyle}>
      {parts.map((part, index) => (
        <Text key={`${part.text}:${index}`} style={part.tone === 'code' && styles.inlineCode}>
          {part.text}
        </Text>
      ))}
    </Text>
  )
}

function WriteCodeBadge({ submitted }: { submitted: boolean }) {
  return (
    <View style={[styles.badge, submitted && styles.badgeSubmitted]}>
      <MaterialCommunityIcons
        color={submitted ? iteraColors.accent : iteraColors.inkBrand}
        name={submitted ? 'check-decagram-outline' : 'code-tags'}
        size={22}
      />
      <Text style={[styles.badgeText, submitted && styles.badgeTextSubmitted]}>
        {submitted ? 'Results' : 'Write Code'}
      </Text>
    </View>
  )
}

function SyntaxCodeBlock({
  accessibilityLabel,
  lines,
}: {
  accessibilityLabel: string
  lines: MobileWriteCodeCodeLine[]
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.codeBlock}>
      {lines.map((line) => (
        <View key={line.number} style={styles.codeLine}>
          <Text style={styles.lineNumber}>{line.number}</Text>
          <Text selectable style={styles.readOnlyCode}>
            {line.parts.map((part, index) => (
              <Text key={`${line.number}:${index}`} style={{ color: codeTone[part.tone] }}>
                {part.text}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  )
}

function ExplanationPanel({ parts }: { parts: MobileWriteCodeTextPart[] }) {
  return (
    <View style={styles.explanationPanel}>
      <View style={styles.explanationIcon}>
        <MaterialCommunityIcons color={iteraColors.inkBrand} name="book-open-page-variant-outline" size={23} />
      </View>
      <View style={styles.explanationCopy}>
        <Text style={styles.explanationTitle}>Explanation</Text>
        <StructuredText parts={parts} textStyle={styles.explanationText} />
      </View>
    </View>
  )
}

export function WriteCodePreviewScreen({
  viewModel,
}: {
  viewModel: MobileWriteCodePreviewViewModel
}) {
  const router = useRouter()
  const revealScale = useRef(new Animated.Value(1)).current
  const [response, setResponse] = useState(viewModel.interaction.starterCode)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const responseReady = writeCodeBehavior.isResponseReady?.(response) ?? false
  const lineCount = Math.max(1, response.split(/\r\n|\r|\n/).length)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  function submit() {
    if (!responseReady || correct !== null) return
    Keyboard.dismiss()
    const grade = writeCodeBehavior.autoGrade?.(viewModel.interaction, response)
    setCorrect(grade?.correct ?? false)
    if (reduceMotion) return
    Animated.sequence([
      Animated.timing(revealScale, {
        toValue: 0.985,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(revealScale, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start()
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ReviewPreviewHeader
        current={viewModel.current}
        exitLabel="Exit Write Code preview"
        hint={correct === null ? 'Write & submit' : 'Inspect result'}
        hintIcon={correct === null ? 'keyboard-outline' : 'check-decagram-outline'}
        onExit={() => router.replace('/today')}
        total={viewModel.total}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.card, { transform: [{ scale: revealScale }] }]}>
            <WriteCodeBadge submitted={correct !== null} />
            <StructuredText parts={viewModel.promptParts} textStyle={styles.prompt} />
            <View style={styles.languagePill}>
              <Text style={styles.languageText}>{viewModel.languageLabel}</Text>
            </View>

            <View style={[styles.editor, correct !== null && styles.editorSubmitted]}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.lineNumbers}>
                {Array.from({ length: lineCount }, (_, index) => (
                  <Text key={index} style={styles.editorLineNumber}>{index + 1}</Text>
                ))}
              </View>
              <TextInput
                accessibilityLabel={`${viewModel.languageLabel} answer editor`}
                autoCapitalize="none"
                autoCorrect={false}
                editable={correct === null}
                multiline
                onChangeText={setResponse}
                selectionColor={iteraColors.accent}
                spellCheck={false}
                style={[
                  styles.editorInput,
                  Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as TextStyle),
                ]}
                textAlignVertical="top"
                value={response}
              />
            </View>

            {correct === null ? (
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
                <MaterialCommunityIcons color={iteraColors.surface} name="send-outline" size={19} />
                <Text style={styles.submitText}>Submit answer</Text>
              </Pressable>
            ) : (
              <View style={[styles.result, correct ? styles.resultCorrect : styles.resultIncorrect]}>
                <MaterialCommunityIcons
                  color={correct ? iteraColors.success : iteraColors.error}
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
              <SyntaxCodeBlock
                accessibilityLabel={`${viewModel.languageLabel} expected answer`}
                lines={viewModel.expectedAnswerLines}
              />
            </View>
          )}

          {correct !== null && <ExplanationPanel parts={viewModel.explanationParts} />}

          {correct !== null && (
            <PreviewRatingControls
              intervals={viewModel.ratingIntervals}
              onSelect={setSelectedRating}
              selected={selectedRating}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  keyboardView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: iteraColors.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 18 },
      android: { elevation: 4 },
      web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' },
    }),
  },
  badge: { minHeight: 42, paddingHorizontal: 16, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeSubmitted: { backgroundColor: iteraColors.accentSofter },
  badgeText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextSubmitted: { color: iteraColors.accentActive },
  prompt: { marginTop: 22, color: iteraColors.inkBrand, fontSize: 24, lineHeight: 33, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  inlineCode: { color: iteraColors.accent, fontFamily: mono },
  languagePill: { minHeight: 34, marginTop: 15, paddingHorizontal: 14, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.navySoft, alignItems: 'center', justifyContent: 'center' },
  languageText: { color: iteraColors.inkBrand, fontFamily: mono, fontSize: 13, fontWeight: '700' },
  editor: { alignSelf: 'stretch', minHeight: 158, marginTop: 22, overflow: 'hidden', borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.borderStrong, backgroundColor: iteraColors.surfaceSubtle, paddingVertical: 13, flexDirection: 'row' },
  editorSubmitted: { backgroundColor: iteraColors.surface },
  lineNumbers: { width: 34, paddingTop: 0, alignItems: 'center' },
  editorLineNumber: { height: 24, color: iteraColors.muted, fontFamily: mono, fontSize: 12, lineHeight: 24 },
  editorInput: { flex: 1, minHeight: 130, maxHeight: 220, borderWidth: 0, paddingTop: 0, paddingBottom: 0, paddingHorizontal: 4, backgroundColor: 'transparent', color: iteraColors.inkBrand, fontFamily: mono, fontSize: 12, lineHeight: 24, outlineWidth: 0 },
  submit: { alignSelf: 'stretch', minHeight: 54, marginTop: 18, borderRadius: iteraRadii.control, backgroundColor: iteraColors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitDisabled: { opacity: 0.38 },
  submitText: { color: iteraColors.surface, fontSize: 17, fontWeight: '700' },
  result: { alignSelf: 'stretch', minHeight: 54, marginTop: 18, borderRadius: iteraRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resultCorrect: { backgroundColor: iteraColors.successSoft },
  resultIncorrect: { backgroundColor: iteraColors.errorSoft },
  resultText: { fontSize: 16, fontWeight: '800' },
  correctText: { color: iteraColors.success },
  incorrectText: { color: iteraColors.error },
  expectedPanel: { borderRadius: 20, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, padding: 16 },
  expectedHeading: { marginBottom: 12, color: iteraColors.muted, fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center', textTransform: 'uppercase' },
  codeBlock: { borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surfaceSubtle, paddingVertical: 12 },
  codeLine: { minHeight: 24, flexDirection: 'row', alignItems: 'flex-start' },
  lineNumber: { width: 34, paddingRight: 8, color: iteraColors.muted, fontFamily: mono, fontSize: 11, lineHeight: 21, textAlign: 'right' },
  readOnlyCode: { flex: 1, paddingRight: 8, color: iteraColors.inkBrand, fontFamily: mono, fontSize: 11, lineHeight: 21 },
  explanationPanel: { borderRadius: 20, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  explanationIcon: { width: 42, height: 42, flexShrink: 0, borderRadius: iteraRadii.control, backgroundColor: iteraColors.navySoft, alignItems: 'center', justifyContent: 'center' },
  explanationCopy: { flex: 1 },
  explanationTitle: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '800' },
  explanationText: { marginTop: 6, color: iteraColors.muted, fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.72 },
})
