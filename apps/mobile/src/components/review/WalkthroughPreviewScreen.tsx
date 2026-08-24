import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  gradeWalkthroughStep,
  initialWalkthroughState,
  iteraColors,
  iteraRadii,
  walkthroughBehavior,
  type ID,
  type ObjectiveResult,
  type Rating,
  type WalkthroughState,
  type WalkthroughStep,
  type WalkthroughStepAnswer,
} from '@itera/core'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
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
  MobileWalkthroughCodeLine,
  MobileWalkthroughPreviewViewModel,
  MobileWalkthroughStepPresentation,
  MobileWalkthroughTextPart,
} from '@/src/types/review'

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

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
  parts: MobileWalkthroughTextPart[]
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

function WalkthroughBadge({ finished }: { finished: boolean }) {
  return (
    <View style={[styles.badge, finished && styles.badgeFinished]}>
      <MaterialCommunityIcons
        color={finished ? iteraColors.accent : iteraColors.inkBrand}
        name={finished ? 'check-decagram-outline' : 'vector-polyline'}
        size={21}
      />
      <Text style={[styles.badgeText, finished && styles.badgeTextFinished]}>
        {finished ? 'Complete' : 'Walkthrough'}
      </Text>
    </View>
  )
}

function InfoPanel({
  kind,
  parts,
  title,
}: {
  kind: 'tip' | 'explanation'
  parts: MobileWalkthroughTextPart[]
  title: string
}) {
  const explanation = kind === 'explanation'
  return (
    <View style={[styles.infoPanel, explanation ? styles.explanationPanel : styles.tipPanel]}>
      <View style={[styles.infoIcon, explanation ? styles.explanationIcon : styles.tipIcon]}>
        <MaterialCommunityIcons
          color={explanation ? iteraColors.success : iteraColors.accent}
          name={explanation ? 'book-open-page-variant-outline' : 'lightbulb-outline'}
          size={21}
        />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <StructuredText parts={parts} textStyle={styles.infoText} />
      </View>
    </View>
  )
}

function FocusedCodeBlock({
  activeStep,
  lines,
}: {
  activeStep: WalkthroughStep
  lines: MobileWalkthroughCodeLine[]
}) {
  const focused = new Set<number>()
  for (const range of activeStep.focus ?? []) {
    for (let line = range.startLine; line <= range.endLine; line++) focused.add(line)
  }

  return (
    <View accessibilityLabel="C++ walkthrough code" style={styles.codeBlock}>
      {lines.map((line) => (
        <View key={line.number} style={[styles.codeLine, focused.has(line.number) && styles.codeLineFocused]}>
          <Text style={styles.lineNumber}>{line.number}</Text>
          <Text selectable style={styles.codeText}>
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

function ResultNote({ result }: { result: ObjectiveResult | null | undefined }) {
  if (!result) return null
  return (
    <View style={[styles.stepResult, result.correct ? styles.stepResultCorrect : styles.stepResultIncorrect]}>
      <MaterialCommunityIcons
        color={result.correct ? iteraColors.success : iteraColors.error}
        name={result.correct ? 'check-circle-outline' : 'close-circle-outline'}
        size={18}
      />
      <Text style={[styles.stepResultText, result.correct ? styles.correctText : styles.incorrectText]}>
        {result.correct ? 'Correct' : 'Incorrect'}
      </Text>
    </View>
  )
}

function MultipleChoiceStep({
  step,
  presentation,
  answer,
  result,
  selected,
  onChange,
  onSubmit,
}: {
  step: WalkthroughStep & { response: Extract<WalkthroughStep['response'], { type: 'multiple_choice' }> }
  presentation: MobileWalkthroughStepPresentation
  answer: WalkthroughStepAnswer | undefined
  result: ObjectiveResult | null | undefined
  selected: ID[]
  onChange: (ids: ID[]) => void
  onSubmit: (answer: WalkthroughStepAnswer) => void
}) {
  const readOnly = answer != null
  const multiple = step.response.selectionMode === 'multiple'

  function toggle(id: ID) {
    if (readOnly) return
    if (multiple) {
      onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id])
    } else {
      onChange([id])
    }
  }

  return (
    <View style={styles.responseBlock}>
      <View accessibilityRole={multiple ? undefined : 'radiogroup'} style={styles.choices}>
        {step.response.options.map((option) => {
          const isSelected = selected.includes(option.id)
          const selectedWrong = readOnly && isSelected && !option.correct
          const correctChoice = readOnly && option.correct
          return (
            <Pressable
              key={option.id}
              accessibilityLabel={option.content.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isSelected, disabled: readOnly }}
              disabled={readOnly}
              onPress={() => toggle(option.id)}
              style={({ pressed }) => [
                styles.choice,
                isSelected && styles.choiceSelected,
                correctChoice && styles.choiceCorrect,
                selectedWrong && styles.choiceIncorrect,
                pressed && styles.pressed,
              ]}
            >
              <View style={[
                styles.choiceIndicator,
                isSelected && styles.choiceIndicatorSelected,
                correctChoice && styles.choiceIndicatorCorrect,
                selectedWrong && styles.choiceIndicatorIncorrect,
              ]}>
                {(isSelected || correctChoice) && (
                  <MaterialCommunityIcons
                    color={correctChoice || selectedWrong ? iteraColors.surface : iteraColors.surface}
                    name={selectedWrong ? 'close' : 'check'}
                    size={17}
                  />
                )}
              </View>
              <StructuredText
                parts={presentation.optionParts?.[option.id] ?? [{ text: option.content.value, tone: 'plain' }]}
                textStyle={styles.choiceText}
              />
            </Pressable>
          )
        })}
      </View>
      {!readOnly && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: selected.length === 0 }}
          disabled={selected.length === 0}
          onPress={() => onSubmit({ type: 'multiple_choice', selected })}
          style={({ pressed }) => [styles.stepSubmit, selected.length === 0 && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.stepSubmitText}>Submit step</Text>
        </Pressable>
      )}
      {readOnly && <ResultNote result={result} />}
    </View>
  )
}

function ExactInputStep({
  answer,
  draft,
  result,
  onChange,
  onSubmit,
}: {
  answer: WalkthroughStepAnswer | undefined
  draft: string
  result: ObjectiveResult | null | undefined
  onChange: (value: string) => void
  onSubmit: (answer: WalkthroughStepAnswer) => void
}) {
  const readOnly = answer != null
  return (
    <View style={styles.responseBlock}>
      <TextInput
        accessibilityLabel="Walkthrough step answer"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!readOnly}
        onChangeText={onChange}
        placeholder="Type your answer"
        placeholderTextColor={iteraColors.muted}
        returnKeyType="done"
        selectionColor={iteraColors.accent}
        style={[
          styles.exactInput,
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as unknown as TextStyle),
        ]}
        value={draft}
      />
      {!readOnly && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !draft.trim() }}
          disabled={!draft.trim()}
          onPress={() => {
            Keyboard.dismiss()
            onSubmit({ type: 'exact_input', value: draft })
          }}
          style={({ pressed }) => [styles.stepSubmit, !draft.trim() && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.stepSubmitText}>Submit step</Text>
        </Pressable>
      )}
      {readOnly && <ResultNote result={result} />}
    </View>
  )
}

function RecallStep({
  answer,
  answerParts,
  onSubmit,
}: {
  answer: WalkthroughStepAnswer | undefined
  answerParts: MobileWalkthroughTextPart[]
  onSubmit: (answer: WalkthroughStepAnswer) => void
}) {
  const revealed = answer?.type === 'recall'
  return (
    <View style={styles.responseBlock}>
      {revealed ? (
        <View style={styles.recallAnswer}>
          <MaterialCommunityIcons color={iteraColors.accent} name="lightbulb-on-outline" size={22} />
          <StructuredText parts={answerParts} textStyle={styles.recallAnswerText} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSubmit({ type: 'recall', revealed: true })}
          style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color={iteraColors.inkBrand} name="cards-outline" size={19} />
          <Text style={styles.revealButtonText}>Reveal answer</Text>
        </Pressable>
      )}
    </View>
  )
}

export function WalkthroughPreviewScreen({
  viewModel,
}: {
  viewModel: MobileWalkthroughPreviewViewModel
}) {
  const router = useRouter()
  const [state, setState] = useState<WalkthroughState>({
    ...initialWalkthroughState,
    answers: {},
    results: {},
  })
  const [choiceDrafts, setChoiceDrafts] = useState<Record<ID, ID[]>>({})
  const [inputDrafts, setInputDrafts] = useState<Record<ID, string>>({})
  const [finished, setFinished] = useState(false)
  const [cardResult, setCardResult] = useState<ObjectiveResult | null>(null)
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  const step = viewModel.interaction.steps[state.stepIndex]
  const presentation = viewModel.stepPresentation.find((item) => item.id === step.id)
  const stepAnswer = state.answers[step.id]
  const stepResult = state.results[step.id]
  const stepAnswered = stepAnswer != null
  const isFirst = state.stepIndex === 0
  const isLast = state.stepIndex === viewModel.interaction.steps.length - 1
  const allAnswered = walkthroughBehavior.isResponseReady(state, viewModel.interaction)

  function submitStep(answer: WalkthroughStepAnswer) {
    if (finished || step.id in state.answers) return
    const result = gradeWalkthroughStep(step, answer)
    setState((current) => ({
      ...current,
      answers: { ...current.answers, [step.id]: answer },
      results: { ...current.results, [step.id]: result },
    }))
  }

  function goTo(index: number) {
    if (index < 0 || index >= viewModel.interaction.steps.length) return
    Keyboard.dismiss()
    setState((current) => ({ ...current, stepIndex: index }))
  }

  function continueOrFinish() {
    if (!stepAnswered || finished) return
    if (!isLast) {
      goTo(state.stepIndex + 1)
      return
    }
    if (!allAnswered) return
    setCardResult(walkthroughBehavior.autoGrade(viewModel.interaction, state))
    setFinished(true)
  }

  if (!presentation) return null

  const score = cardResult?.score == null ? null : Math.round(cardResult.score * 100)

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ReviewPreviewHeader
        current={viewModel.current}
        exitLabel="Exit Walkthrough preview"
        hint={finished ? 'Rate the card' : `Step ${state.stepIndex + 1} of ${viewModel.interaction.steps.length}`}
        hintIcon={finished ? 'check-decagram-outline' : 'debug-step-over'}
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
          <View style={styles.card}>
            <WalkthroughBadge finished={finished} />
            <StructuredText parts={viewModel.promptParts} textStyle={styles.prompt} />
            <StructuredText parts={viewModel.scenarioParts} textStyle={styles.scenario} />

            {!finished && (
              <InfoPanel kind="tip" parts={viewModel.globalTipParts} title="Tip for the walkthrough" />
            )}

            <FocusedCodeBlock activeStep={step} lines={viewModel.codeLines} />

            <View style={styles.stepHeader}>
              <Text style={styles.stepCount}>Step {state.stepIndex + 1} of {viewModel.interaction.steps.length}</Text>
              <View accessibilityLabel={`${Object.keys(state.answers).length} of ${viewModel.interaction.steps.length} steps answered`} style={styles.stepDots}>
                {viewModel.interaction.steps.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.stepDot,
                      item.id in state.answers && styles.stepDotAnswered,
                      index === state.stepIndex && styles.stepDotCurrent,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View accessibilityLabel={`Walkthrough step ${state.stepIndex + 1}`} style={styles.stepPanel}>
              <StructuredText parts={presentation.promptParts} textStyle={styles.stepPrompt} />

              {step.response.type === 'multiple_choice' && (
                <MultipleChoiceStep
                  answer={stepAnswer}
                  onChange={(ids) => setChoiceDrafts((current) => ({ ...current, [step.id]: ids }))}
                  onSubmit={submitStep}
                  presentation={presentation}
                  result={stepResult}
                  selected={choiceDrafts[step.id] ?? []}
                  step={step as WalkthroughStep & { response: Extract<WalkthroughStep['response'], { type: 'multiple_choice' }> }}
                />
              )}

              {step.response.type === 'exact_input' && (
                <ExactInputStep
                  answer={stepAnswer}
                  draft={inputDrafts[step.id] ?? ''}
                  onChange={(value) => setInputDrafts((current) => ({ ...current, [step.id]: value }))}
                  onSubmit={submitStep}
                  result={stepResult}
                />
              )}

              {step.response.type === 'recall' && (
                <RecallStep
                  answer={stepAnswer}
                  answerParts={presentation.recallAnswerParts ?? []}
                  onSubmit={submitStep}
                />
              )}

              {!stepAnswered && (
                <InfoPanel kind="tip" parts={presentation.tipParts} title="Tip for this step" />
              )}
              {stepAnswered && (
                <InfoPanel kind="explanation" parts={presentation.explanationParts} title="Explanation for this step" />
              )}
            </View>

            <View style={styles.navigationRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isFirst }}
                disabled={isFirst}
                onPress={() => goTo(state.stepIndex - 1)}
                style={({ pressed }) => [styles.previousButton, isFirst && styles.disabled, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons color={iteraColors.muted} name="chevron-left" size={20} />
                <Text style={styles.previousText}>Previous</Text>
              </Pressable>

              {stepAnswered && !finished && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isLast && !allAnswered }}
                  disabled={isLast && !allAnswered}
                  onPress={continueOrFinish}
                  style={({ pressed }) => [styles.continueButton, isLast && !allAnswered && styles.disabled, pressed && styles.pressed]}
                >
                  <Text style={styles.continueText}>{isLast ? 'Finish' : 'Continue'}</Text>
                  <MaterialCommunityIcons color={iteraColors.surface} name={isLast ? 'check' : 'chevron-right'} size={20} />
                </Pressable>
              )}
            </View>

            {finished && (
              <View style={[styles.finalResult, cardResult?.correct === false ? styles.finalResultIncorrect : styles.finalResultCorrect]}>
                <MaterialCommunityIcons
                  color={cardResult?.correct === false ? iteraColors.error : iteraColors.success}
                  name={cardResult?.correct === false ? 'alert-circle-outline' : 'check-circle-outline'}
                  size={20}
                />
                <Text style={[styles.finalResultText, cardResult?.correct === false ? styles.incorrectText : styles.correctText]}>
                  {cardResult == null
                    ? 'Walkthrough complete'
                    : cardResult.correct
                      ? 'Every objective step is correct'
                      : `${score}% of objective steps correct`}
                </Text>
              </View>
            )}
          </View>

          {finished && (
            <InfoPanel
              kind="explanation"
              parts={viewModel.globalExplanationParts}
              title="Explanation for the walkthrough"
            />
          )}

          {finished && (
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  keyboardView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, paddingHorizontal: 18, paddingVertical: 20, alignItems: 'center', ...Platform.select({ ios: { shadowColor: iteraColors.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 18 }, android: { elevation: 4 }, web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' } }) },
  badge: { minHeight: 42, paddingHorizontal: 16, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeFinished: { backgroundColor: iteraColors.accentSofter },
  badgeText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextFinished: { color: iteraColors.accentActive },
  prompt: { marginTop: 20, color: iteraColors.inkBrand, fontSize: 23, lineHeight: 31, fontWeight: '700', letterSpacing: -0.35, textAlign: 'center' },
  scenario: { marginTop: 10, color: iteraColors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  inlineCode: { color: iteraColors.accent, fontFamily: mono },
  infoPanel: { alignSelf: 'stretch', borderRadius: iteraRadii.card, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipPanel: { marginTop: 16, borderColor: '#f4dccb', backgroundColor: iteraColors.accentSofter },
  explanationPanel: { marginTop: 14, borderColor: '#cfe5d5', backgroundColor: iteraColors.successSoft },
  infoIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: iteraRadii.control, alignItems: 'center', justifyContent: 'center' },
  tipIcon: { backgroundColor: iteraColors.surface },
  explanationIcon: { backgroundColor: iteraColors.surface },
  infoCopy: { flex: 1 },
  infoTitle: { color: iteraColors.inkBrand, fontSize: 13, fontWeight: '800' },
  infoText: { marginTop: 3, color: iteraColors.muted, fontSize: 12, lineHeight: 18 },
  codeBlock: { alignSelf: 'stretch', marginTop: 18, overflow: 'hidden', borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surfaceSubtle, paddingVertical: 10 },
  codeLine: { minHeight: 23, paddingVertical: 1, flexDirection: 'row', alignItems: 'flex-start' },
  codeLineFocused: { backgroundColor: '#fff1e7' },
  lineNumber: { width: 30, paddingRight: 7, color: iteraColors.muted, fontFamily: mono, fontSize: 10, lineHeight: 21, textAlign: 'right' },
  codeText: { flex: 1, paddingRight: 6, color: iteraColors.inkBrand, fontFamily: mono, fontSize: 10.5, lineHeight: 21 },
  stepHeader: { alignSelf: 'stretch', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepCount: { color: iteraColors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  stepDots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepDot: { width: 24, height: 6, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.border },
  stepDotAnswered: { backgroundColor: '#79b98a' },
  stepDotCurrent: { backgroundColor: iteraColors.accent },
  stepPanel: { alignSelf: 'stretch', marginTop: 10, borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, padding: 14 },
  stepPrompt: { color: iteraColors.inkBrand, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  responseBlock: { marginTop: 14 },
  choices: { gap: 10 },
  choice: { minHeight: 72, borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  choiceSelected: { borderWidth: 1.5, borderColor: iteraColors.accent, backgroundColor: iteraColors.accentSofter },
  choiceCorrect: { borderColor: '#86c99b', backgroundColor: iteraColors.successSoft },
  choiceIncorrect: { borderColor: '#e1a29e', backgroundColor: iteraColors.errorSoft },
  choiceIndicator: { width: 30, height: 30, flexShrink: 0, borderRadius: 15, borderWidth: 2, borderColor: iteraColors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  choiceIndicatorSelected: { borderColor: iteraColors.accent, backgroundColor: iteraColors.accent },
  choiceIndicatorCorrect: { borderColor: iteraColors.success, backgroundColor: iteraColors.success },
  choiceIndicatorIncorrect: { borderColor: iteraColors.error, backgroundColor: iteraColors.error },
  choiceText: { flex: 1, color: iteraColors.inkBrand, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  stepSubmit: { minHeight: 46, marginTop: 12, borderRadius: iteraRadii.control, backgroundColor: iteraColors.accent, alignItems: 'center', justifyContent: 'center' },
  stepSubmitText: { color: iteraColors.surface, fontSize: 14, fontWeight: '800' },
  exactInput: { minHeight: 48, borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.borderStrong, backgroundColor: iteraColors.surface, paddingHorizontal: 13, color: iteraColors.inkBrand, fontFamily: mono, fontSize: 15, outlineWidth: 0 },
  stepResult: { minHeight: 38, borderRadius: iteraRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stepResultCorrect: { backgroundColor: iteraColors.successSoft },
  stepResultIncorrect: { backgroundColor: iteraColors.errorSoft },
  stepResultText: { fontSize: 13, fontWeight: '800' },
  correctText: { color: iteraColors.success },
  incorrectText: { color: iteraColors.error },
  recallAnswer: { borderRadius: iteraRadii.control, backgroundColor: iteraColors.navySoft, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  recallAnswerText: { flex: 1, color: iteraColors.inkBrand, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  revealButton: { minHeight: 48, borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.borderStrong, backgroundColor: iteraColors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  revealButtonText: { color: iteraColors.inkBrand, fontSize: 14, fontWeight: '700' },
  navigationRow: { alignSelf: 'stretch', minHeight: 50, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previousButton: { minWidth: 112, minHeight: 46, borderRadius: iteraRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  previousText: { color: iteraColors.muted, fontSize: 14, fontWeight: '700' },
  continueButton: { minWidth: 126, minHeight: 48, paddingHorizontal: 16, borderRadius: iteraRadii.control, backgroundColor: iteraColors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  continueText: { color: iteraColors.surface, fontSize: 15, fontWeight: '800' },
  finalResult: { alignSelf: 'stretch', minHeight: 50, marginTop: 8, borderRadius: iteraRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  finalResultCorrect: { backgroundColor: iteraColors.successSoft },
  finalResultIncorrect: { backgroundColor: iteraColors.errorSoft },
  finalResultText: { fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.36 },
  pressed: { opacity: 0.72 },
})
