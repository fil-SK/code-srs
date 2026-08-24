import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  gradeMultipleChoice,
  iteraColors,
  iteraRadii,
  multipleChoiceBehavior,
  type ID,
  type MultipleChoiceGrade,
  type Rating,
} from '@itera/core'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PreviewRatingControls } from '@/src/components/review/PreviewRatingControls'
import { ReviewPreviewHeader } from '@/src/components/review/ReviewPreviewHeader'
import type {
  MobileMultipleChoicePreviewViewModel,
  MobileMultipleChoiceTextPart,
} from '@/src/types/review'

function StructuredText({
  parts,
  textStyle,
}: {
  parts: MobileMultipleChoiceTextPart[]
  textStyle: TextStyle
}) {
  return (
    <Text style={textStyle}>
      {parts.map((part, index) => (
        <Text key={`${part.text}:${index}`} style={part.tone === 'code' && styles.codeText}>
          {part.text}
        </Text>
      ))}
    </Text>
  )
}

function MultipleChoiceBadge({ submitted }: { submitted: boolean }) {
  return (
    <View style={[styles.badge, submitted && styles.badgeSubmitted]}>
      <MaterialCommunityIcons
        color={submitted ? iteraColors.accent : iteraColors.inkBrand}
        name={submitted ? 'check-decagram-outline' : 'format-list-checks'}
        size={21}
      />
      <Text style={[styles.badgeText, submitted && styles.badgeTextSubmitted]}>
        {submitted ? 'Results' : 'Multiple Choice'}
      </Text>
    </View>
  )
}

function ChoiceIndicator({
  selected,
  single,
  result,
}: {
  selected: boolean
  single: boolean
  result: 'correct' | 'incorrect' | 'missed' | null
}) {
  if (result === 'incorrect') {
    return (
      <View style={[styles.indicator, styles.indicatorIncorrect]}>
        <MaterialCommunityIcons color={iteraColors.surface} name="close" size={22} />
      </View>
    )
  }
  if (result === 'correct' || result === 'missed') {
    return (
      <View style={[styles.indicator, styles.indicatorCorrect, result === 'missed' && styles.indicatorMissed]}>
        <MaterialCommunityIcons
          color={result === 'missed' ? iteraColors.success : iteraColors.surface}
          name="check"
          size={22}
        />
      </View>
    )
  }
  return (
    <View style={[styles.indicator, selected && styles.indicatorSelected]}>
      {selected && (
        single
          ? <View style={styles.radioDot} />
          : <MaterialCommunityIcons color={iteraColors.surface} name="check" size={22} />
      )}
    </View>
  )
}

function resultFor(id: ID, grade: MultipleChoiceGrade | null) {
  if (!grade) return null
  if (grade.selectedCorrect.includes(id)) return 'correct' as const
  if (grade.selectedIncorrect.includes(id)) return 'incorrect' as const
  if (grade.missedCorrect.includes(id)) return 'missed' as const
  return null
}

export function MultipleChoicePreviewScreen({
  viewModel,
}: {
  viewModel: MobileMultipleChoicePreviewViewModel
}) {
  const router = useRouter()
  const revealScale = useRef(new Animated.Value(1)).current
  const [selectedIds, setSelectedIds] = useState<ID[]>([])
  const [grade, setGrade] = useState<MultipleChoiceGrade | null>(null)
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const single = viewModel.interaction.selectionMode === 'single'
  const responseReady = multipleChoiceBehavior.isResponseReady?.(selectedIds) ?? false
  const optionById = new Map(viewModel.interaction.options.map((option) => [option.id, option]))

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  function toggle(id: ID) {
    if (grade) return
    if (single) {
      setSelectedIds([id])
      return
    }
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    ))
  }

  function submit() {
    if (!responseReady || grade) return
    const nextGrade = gradeMultipleChoice(viewModel.interaction, selectedIds)
    if (reduceMotion) {
      setGrade(nextGrade)
      return
    }
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
    setGrade(nextGrade)
  }

  const correctTotal = viewModel.interaction.options.filter((option) => option.correct).length
  const selectedCorrectTotal = grade?.selectedCorrect.length ?? 0

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ReviewPreviewHeader
        current={viewModel.current}
        exitLabel="Exit Multiple Choice preview"
        hint={grade ? 'Inspect results' : single ? 'Choose one' : 'Select all'}
        hintIcon={grade ? 'check-decagram-outline' : 'checkbox-multiple-marked-outline'}
        onExit={() => router.replace('/today')}
        total={viewModel.total}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.card, { transform: [{ scale: revealScale }] }]}>
          <MultipleChoiceBadge submitted={Boolean(grade)} />
          <StructuredText parts={viewModel.promptParts} textStyle={styles.prompt} />
          <Text style={styles.instruction}>
            {single ? 'Choose one answer.' : 'Select all that apply.'}
          </Text>

          <View accessibilityRole={single ? 'radiogroup' : undefined} style={styles.options}>
            {viewModel.presentedOptionIds.map((id) => {
              const option = optionById.get(id)
              if (!option) return null
              const selected = selectedIds.includes(id)
              const result = resultFor(id, grade)
              const resultLabel = result === 'correct'
                ? 'Correct'
                : result === 'incorrect'
                  ? 'Incorrect'
                  : result === 'missed'
                    ? 'Correct answer'
                    : null
              return (
                <Pressable
                  key={id}
                  accessibilityHint={grade ? resultLabel ?? 'Not a correct answer' : 'Toggles this answer'}
                  accessibilityLabel={option.content.value}
                  accessibilityRole={single ? 'radio' : 'checkbox'}
                  accessibilityState={{ checked: selected, disabled: Boolean(grade) }}
                  disabled={Boolean(grade)}
                  onPress={() => toggle(id)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    result === 'correct' && styles.optionCorrect,
                    result === 'incorrect' && styles.optionIncorrect,
                    result === 'missed' && styles.optionMissed,
                    pressed && styles.pressed,
                  ]}
                >
                  <ChoiceIndicator result={result} selected={selected} single={single} />
                  <View style={styles.optionCopy}>
                    <StructuredText
                      parts={viewModel.optionParts[id] ?? [{ text: option.content.value, tone: 'plain' }]}
                      textStyle={styles.optionText}
                    />
                    {resultLabel && (
                      <Text
                        style={[
                          styles.resultLabel,
                          result === 'incorrect' ? styles.incorrectText : styles.correctText,
                        ]}
                      >
                        {resultLabel}
                      </Text>
                    )}
                  </View>
                </Pressable>
              )
            })}
          </View>

          {!grade ? (
            <View style={styles.actionRow}>
              <View style={styles.helper}>
                <MaterialCommunityIcons color={iteraColors.accent} name="information-outline" size={20} />
                <Text style={styles.helperText}>
                  {responseReady
                    ? `${selectedIds.length} selected`
                    : single ? 'Choose an option' : 'Choose one or more options'}
                </Text>
              </View>
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
                <Text style={styles.submitText}>Submit answer</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.summary, grade.correct ? styles.summaryCorrect : styles.summaryIncorrect]}>
              <MaterialCommunityIcons
                color={grade.correct ? iteraColors.success : iteraColors.error}
                name={grade.correct ? 'check-circle-outline' : 'alert-circle-outline'}
                size={21}
              />
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryTitle, grade.correct ? styles.correctText : styles.incorrectText]}>
                  {grade.correct ? 'Correct answer' : 'Review the highlighted choices'}
                </Text>
                {!grade.correct && (
                  <Text style={styles.summaryDetail}>
                    {selectedCorrectTotal} of {correctTotal} correct choices selected
                  </Text>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        {grade && (
          <PreviewRatingControls
            intervals={viewModel.ratingIntervals}
            onSelect={setSelectedRating}
            selected={selectedRating}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
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
  prompt: { marginTop: 22, color: iteraColors.inkBrand, fontSize: 25, lineHeight: 34, fontWeight: '700', letterSpacing: -0.45, textAlign: 'center' },
  codeText: { color: iteraColors.accent, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  instruction: { marginTop: 9, color: iteraColors.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  options: { alignSelf: 'stretch', marginTop: 24, gap: 12 },
  option: { minHeight: 90, borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, paddingHorizontal: 15, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionSelected: { borderWidth: 1.5, borderColor: iteraColors.inkBrand, backgroundColor: iteraColors.selectionSoft },
  optionCorrect: { borderColor: '#86c99b', backgroundColor: iteraColors.successSoft },
  optionIncorrect: { borderColor: '#e1a29e', backgroundColor: iteraColors.errorSoft },
  optionMissed: { borderWidth: 1.5, borderColor: iteraColors.success, backgroundColor: iteraColors.surface },
  indicator: { width: 42, height: 42, flexShrink: 0, borderRadius: 21, borderWidth: 2, borderColor: iteraColors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  indicatorSelected: { borderColor: iteraColors.navy, backgroundColor: iteraColors.navy },
  indicatorCorrect: { borderColor: iteraColors.success, backgroundColor: iteraColors.success },
  indicatorIncorrect: { borderColor: iteraColors.error, backgroundColor: iteraColors.error },
  indicatorMissed: { backgroundColor: iteraColors.surface },
  radioDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: iteraColors.surface },
  optionCopy: { flex: 1, gap: 5 },
  optionText: { color: iteraColors.inkBrand, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  resultLabel: { fontSize: 11, lineHeight: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  correctText: { color: iteraColors.success },
  incorrectText: { color: iteraColors.error },
  actionRow: { alignSelf: 'stretch', marginTop: 20, gap: 12 },
  helper: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  helperText: { color: iteraColors.muted, fontSize: 13, fontWeight: '600' },
  submit: { minHeight: 54, borderRadius: iteraRadii.control, backgroundColor: iteraColors.accent, alignItems: 'center', justifyContent: 'center' },
  submitDisabled: { opacity: 0.38 },
  submitText: { color: iteraColors.surface, fontSize: 17, fontWeight: '700' },
  summary: { alignSelf: 'stretch', minHeight: 58, marginTop: 20, borderRadius: iteraRadii.control, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  summaryCorrect: { backgroundColor: iteraColors.successSoft },
  summaryIncorrect: { backgroundColor: iteraColors.errorSoft },
  summaryCopy: { alignItems: 'center' },
  summaryTitle: { fontSize: 14, fontWeight: '800' },
  summaryDetail: { marginTop: 2, color: iteraColors.muted, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.72 },
})
