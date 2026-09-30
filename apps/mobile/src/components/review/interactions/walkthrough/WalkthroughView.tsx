import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  gradeWalkthroughStep,
  initialWalkthroughState,
  fliptapColors,
  fliptapRadii,
  stripInlineMarkers,
  walkthroughBehavior,
  type ID,
  type ObjectiveResult,
  type RichContent,
  type WalkthroughState,
  type WalkthroughStep,
  type WalkthroughStepAnswer,
} from '@fliptap/core'
import { useState } from 'react'
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native'

import { monoFamily } from '@/src/components/text/monoFamily'
import { RichInlineNative, RichTextNative } from '@/src/components/text/RichTextNative'
import { SafeCardImage } from '@/src/components/text/SafeCardImage'
import type { NativeInteractionViewProps } from '../types'

// Walkthrough: one card, many steps, exactly one final rating.
//
// The per-step semantics are shared - gradeWalkthroughStep decides a step,
// walkthroughBehavior.isResponseReady decides when every step is answered, and
// walkthroughBehavior.autoGrade aggregates the card. The response threaded
// through the session is core's own WalkthroughState, so no second notion of
// "where the learner is" exists on this platform.
//
// One ReviewLog per card, never one per step: the host grades once, when the
// learner rates the finished card.
//
// Card-level Tip and Explanation belong to the session shell, exactly as on
// web. This View shows only the per-step ones.

const mono = monoFamily

function WalkthroughBadge({ finished }: { finished: boolean }) {
  return (
    <View style={[styles.badge, finished && styles.badgeFinished]}>
      <MaterialCommunityIcons
        color={finished ? fliptapColors.accent : fliptapColors.inkBrand}
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
  content,
  title,
}: {
  kind: 'tip' | 'explanation'
  content: RichContent | undefined
  title: string
}) {
  if (!content) return null
  const explanation = kind === 'explanation'
  return (
    <View style={[styles.infoPanel, explanation ? styles.explanationPanel : styles.tipPanel]}>
      <View style={[styles.infoIcon, explanation ? styles.explanationIcon : styles.tipIcon]}>
        <MaterialCommunityIcons
          color={explanation ? fliptapColors.success : fliptapColors.accent}
          name={explanation ? 'book-open-page-variant-outline' : 'lightbulb-outline'}
          size={21}
        />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <RichTextNative style={styles.infoText} text={content.value} />
      </View>
    </View>
  )
}

function FocusedCodeBlock({
  activeStep,
  code,
  language,
}: {
  activeStep: WalkthroughStep
  code: string
  language: string
}) {
  const focused = new Set<number>()
  for (const range of activeStep.focus ?? []) {
    for (let line = range.startLine; line <= range.endLine; line++) focused.add(line)
  }

  return (
    <View accessibilityLabel={`${language} walkthrough code`} style={styles.codeBlock}>
      {code.split('\n').map((line, index) => (
        <View
          key={index}
          style={[styles.codeLine, focused.has(index + 1) && styles.codeLineFocused]}
        >
          <Text style={styles.lineNumber}>{index + 1}</Text>
          <Text selectable style={styles.codeText}>
            {line}
          </Text>
        </View>
      ))}
    </View>
  )
}

function ResultNote({ result }: { result: ObjectiveResult | null | undefined }) {
  if (!result) return null
  return (
    <View
      style={[
        styles.stepResult,
        result.correct ? styles.stepResultCorrect : styles.stepResultIncorrect,
      ]}
    >
      <MaterialCommunityIcons
        color={result.correct ? fliptapColors.success : fliptapColors.error}
        name={result.correct ? 'check-circle-outline' : 'close-circle-outline'}
        size={18}
      />
      <Text
        style={[styles.stepResultText, result.correct ? styles.correctText : styles.incorrectText]}
      >
        {result.correct ? 'Correct' : 'Incorrect'}
      </Text>
    </View>
  )
}

function MultipleChoiceStep({
  step,
  answer,
  result,
  selected,
  onChange,
  onSubmit,
}: {
  step: WalkthroughStep & {
    response: Extract<WalkthroughStep['response'], { type: 'multiple_choice' }>
  }
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
              accessibilityLabel={stripInlineMarkers(option.content.value)}
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
              <View
                style={[
                  styles.choiceIndicator,
                  isSelected && styles.choiceIndicatorSelected,
                  correctChoice && styles.choiceIndicatorCorrect,
                  selectedWrong && styles.choiceIndicatorIncorrect,
                ]}
              >
                {(isSelected || correctChoice) && (
                  <MaterialCommunityIcons
                    color={fliptapColors.surface}
                    name={selectedWrong ? 'close' : 'check'}
                    size={17}
                  />
                )}
              </View>
              <RichInlineNative style={styles.choiceText} text={option.content.value} />
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
          style={({ pressed }) => [
            styles.stepSubmit,
            selected.length === 0 && styles.disabled,
            pressed && styles.pressed,
          ]}
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
        placeholderTextColor={fliptapColors.muted}
        returnKeyType="done"
        selectionColor={fliptapColors.accent}
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
          style={({ pressed }) => [
            styles.stepSubmit,
            !draft.trim() && styles.disabled,
            pressed && styles.pressed,
          ]}
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
  answerContent,
  onSubmit,
}: {
  answer: WalkthroughStepAnswer | undefined
  answerContent: RichContent
  onSubmit: (answer: WalkthroughStepAnswer) => void
}) {
  const revealed = answer?.type === 'recall'
  return (
    <View style={styles.responseBlock}>
      {revealed ? (
        <View style={styles.recallAnswer}>
          <MaterialCommunityIcons color={fliptapColors.accent} name="lightbulb-on-outline" size={22} />
          <RichTextNative style={styles.recallAnswerText} text={answerContent.value} />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSubmit({ type: 'recall', revealed: true })}
          style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons color={fliptapColors.inkBrand} name="cards-outline" size={19} />
          <Text style={styles.revealButtonText}>Reveal answer</Text>
        </Pressable>
      )}
    </View>
  )
}

export function WalkthroughView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
}: NativeInteractionViewProps<'walkthrough'>) {
  const interaction = card.interaction
  const [choiceDrafts, setChoiceDrafts] = useState<Record<ID, ID[]>>({})
  const [inputDrafts, setInputDrafts] = useState<Record<ID, string>>({})

  const state = (response as WalkthroughState | undefined) ?? initialWalkthroughState
  const finished = phase.kind !== 'presenting' && phase.kind !== 'submitting'
  const step = interaction.steps[state.stepIndex]
  const stepAnswer = state.answers[step.id]
  const stepResult = state.results[step.id]
  const stepAnswered = stepAnswer != null
  const isFirst = state.stepIndex === 0
  const isLast = state.stepIndex === interaction.steps.length - 1
  const allAnswered = walkthroughBehavior.isResponseReady(state, interaction)
  // Recomputed rather than read off the phase, so the summary survives the
  // move to `transitioning` after a rating is chosen. Same shared aggregate the
  // host graded with, on the same inputs.
  const cardResult = finished ? walkthroughBehavior.autoGrade(interaction, state) : null

  function submitStep(answer: WalkthroughStepAnswer) {
    // Never overwrite an existing key: the first submitted objective result for
    // a step is the one that counts, which is what makes stepping back through
    // an answered walkthrough inspection rather than a second attempt.
    if (finished || step.id in state.answers) return
    const result = gradeWalkthroughStep(step, answer)
    setResponse({
      ...state,
      answers: { ...state.answers, [step.id]: answer },
      results: { ...state.results, [step.id]: result },
    })
  }

  function goTo(index: number) {
    if (index < 0 || index >= interaction.steps.length) return
    Keyboard.dismiss()
    setResponse({ ...state, stepIndex: index })
  }

  function continueOrFinish() {
    if (!stepAnswered || finished) return
    if (!isLast) {
      goTo(state.stepIndex + 1)
      return
    }
    if (!allAnswered) return
    onPrimaryAction()
  }

  const score = cardResult?.score == null ? null : Math.round(cardResult.score * 100)

  return (
    <View style={styles.card}>
      <WalkthroughBadge finished={finished} />
      <RichTextNative style={styles.prompt} text={card.prompt.value} />
      <RichTextNative style={styles.scenario} text={interaction.scenario.value} />

      <SafeCardImage label="Walkthrough diagram" source={interaction.image} />

      {interaction.code && (
        <FocusedCodeBlock
          activeStep={step}
          code={interaction.code.value}
          language={interaction.code.language}
        />
      )}

      <View style={styles.stepHeader}>
        <Text style={styles.stepCount}>
          Step {state.stepIndex + 1} of {interaction.steps.length}
        </Text>
        <View
          accessibilityLabel={`${Object.keys(state.answers).length} of ${interaction.steps.length} steps answered`}
          style={styles.stepDots}
        >
          {interaction.steps.map((item, index) => (
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
        <RichTextNative style={styles.stepPrompt} text={step.prompt.value} />

        {step.response.type === 'multiple_choice' && (
          <MultipleChoiceStep
            answer={stepAnswer}
            onChange={(ids) => setChoiceDrafts((current) => ({ ...current, [step.id]: ids }))}
            onSubmit={submitStep}
            result={stepResult}
            selected={choiceDrafts[step.id] ?? []}
            step={
              step as WalkthroughStep & {
                response: Extract<WalkthroughStep['response'], { type: 'multiple_choice' }>
              }
            }
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
            answerContent={step.response.answer}
            onSubmit={submitStep}
          />
        )}

        {!stepAnswered && <InfoPanel content={step.tip} kind="tip" title="Tip for this step" />}
        {stepAnswered && (
          <InfoPanel
            content={step.explanation}
            kind="explanation"
            title="Explanation for this step"
          />
        )}
      </View>

      <View style={styles.navigationRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isFirst }}
          disabled={isFirst}
          onPress={() => goTo(state.stepIndex - 1)}
          style={({ pressed }) => [
            styles.previousButton,
            isFirst && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons color={fliptapColors.muted} name="chevron-left" size={20} />
          <Text style={styles.previousText}>Previous</Text>
        </Pressable>

        {stepAnswered && !finished && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isLast && !allAnswered }}
            disabled={isLast && !allAnswered}
            onPress={continueOrFinish}
            style={({ pressed }) => [
              styles.continueButton,
              isLast && !allAnswered && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.continueText}>{isLast ? 'Finish' : 'Continue'}</Text>
            <MaterialCommunityIcons
              color={fliptapColors.surface}
              name={isLast ? 'check' : 'chevron-right'}
              size={20}
            />
          </Pressable>
        )}
      </View>

      {finished && (
        <View
          style={[
            styles.finalResult,
            cardResult?.correct === false ? styles.finalResultIncorrect : styles.finalResultCorrect,
          ]}
        >
          <MaterialCommunityIcons
            color={cardResult?.correct === false ? fliptapColors.error : fliptapColors.success}
            name={cardResult?.correct === false ? 'alert-circle-outline' : 'check-circle-outline'}
            size={20}
          />
          <Text
            style={[
              styles.finalResultText,
              cardResult?.correct === false ? styles.incorrectText : styles.correctText,
            ]}
          >
            {cardResult == null
              ? 'Walkthrough complete'
              : cardResult.correct
                ? 'Every objective step is correct'
                : `${score}% of objective steps correct`}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, borderColor: fliptapColors.border, backgroundColor: fliptapColors.surface, paddingHorizontal: 18, paddingVertical: 20, alignItems: 'center', ...Platform.select({ ios: { shadowColor: fliptapColors.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 18 }, android: { elevation: 4 }, web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' } }) },
  badge: { minHeight: 42, paddingHorizontal: 16, borderRadius: fliptapRadii.pill, backgroundColor: fliptapColors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeFinished: { backgroundColor: fliptapColors.accentSofter },
  badgeText: { color: fliptapColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextFinished: { color: fliptapColors.accentActive },
  prompt: { marginTop: 20, color: fliptapColors.inkBrand, fontSize: 23, lineHeight: 31, fontWeight: '700', letterSpacing: -0.35, textAlign: 'center' },
  scenario: { marginTop: 10, color: fliptapColors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  infoPanel: { alignSelf: 'stretch', borderRadius: fliptapRadii.card, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipPanel: { marginTop: 16, borderColor: '#f4dccb', backgroundColor: fliptapColors.accentSofter },
  explanationPanel: { marginTop: 14, borderColor: '#cfe5d5', backgroundColor: fliptapColors.successSoft },
  infoIcon: { width: 36, height: 36, flexShrink: 0, borderRadius: fliptapRadii.control, alignItems: 'center', justifyContent: 'center' },
  tipIcon: { backgroundColor: fliptapColors.surface },
  explanationIcon: { backgroundColor: fliptapColors.surface },
  infoCopy: { flex: 1 },
  infoTitle: { color: fliptapColors.inkBrand, fontSize: 13, fontWeight: '800' },
  infoText: { marginTop: 3, color: fliptapColors.muted, fontSize: 12, lineHeight: 18 },
  codeBlock: { alignSelf: 'stretch', marginTop: 18, overflow: 'hidden', borderRadius: fliptapRadii.card, borderWidth: 1, borderColor: fliptapColors.border, backgroundColor: fliptapColors.surfaceSubtle, paddingVertical: 10 },
  codeLine: { minHeight: 23, paddingVertical: 1, flexDirection: 'row', alignItems: 'flex-start' },
  codeLineFocused: { backgroundColor: '#fff1e7' },
  lineNumber: { width: 30, paddingRight: 7, color: fliptapColors.muted, fontFamily: mono, fontSize: 10, lineHeight: 21, textAlign: 'right' },
  codeText: { flex: 1, paddingRight: 6, color: fliptapColors.inkBrand, fontFamily: mono, fontSize: 10.5, lineHeight: 21 },
  stepHeader: { alignSelf: 'stretch', marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepCount: { color: fliptapColors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  stepDots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepDot: { width: 24, height: 6, borderRadius: fliptapRadii.pill, backgroundColor: fliptapColors.border },
  stepDotAnswered: { backgroundColor: '#79b98a' },
  stepDotCurrent: { backgroundColor: fliptapColors.accent },
  stepPanel: { alignSelf: 'stretch', marginTop: 10, borderRadius: fliptapRadii.card, borderWidth: 1, borderColor: fliptapColors.border, backgroundColor: fliptapColors.surface, padding: 14 },
  stepPrompt: { color: fliptapColors.inkBrand, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  responseBlock: { marginTop: 14 },
  choices: { gap: 10 },
  choice: { minHeight: 72, borderRadius: fliptapRadii.control, borderWidth: 1, borderColor: fliptapColors.border, backgroundColor: fliptapColors.surface, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  choiceSelected: { borderWidth: 1.5, borderColor: fliptapColors.accent, backgroundColor: fliptapColors.accentSofter },
  choiceCorrect: { borderColor: '#86c99b', backgroundColor: fliptapColors.successSoft },
  choiceIncorrect: { borderColor: '#e1a29e', backgroundColor: fliptapColors.errorSoft },
  choiceIndicator: { width: 30, height: 30, flexShrink: 0, borderRadius: 15, borderWidth: 2, borderColor: fliptapColors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  choiceIndicatorSelected: { borderColor: fliptapColors.accent, backgroundColor: fliptapColors.accent },
  choiceIndicatorCorrect: { borderColor: fliptapColors.success, backgroundColor: fliptapColors.success },
  choiceIndicatorIncorrect: { borderColor: fliptapColors.error, backgroundColor: fliptapColors.error },
  choiceText: { flex: 1, color: fliptapColors.inkBrand, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  stepSubmit: { minHeight: 46, marginTop: 12, borderRadius: fliptapRadii.control, backgroundColor: fliptapColors.accent, alignItems: 'center', justifyContent: 'center' },
  stepSubmitText: { color: fliptapColors.surface, fontSize: 14, fontWeight: '800' },
  exactInput: { minHeight: 48, borderRadius: fliptapRadii.control, borderWidth: 1, borderColor: fliptapColors.borderStrong, backgroundColor: fliptapColors.surface, paddingHorizontal: 13, color: fliptapColors.inkBrand, fontFamily: mono, fontSize: 15, outlineWidth: 0 },
  stepResult: { minHeight: 38, borderRadius: fliptapRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stepResultCorrect: { backgroundColor: fliptapColors.successSoft },
  stepResultIncorrect: { backgroundColor: fliptapColors.errorSoft },
  stepResultText: { fontSize: 13, fontWeight: '800' },
  correctText: { color: fliptapColors.success },
  incorrectText: { color: fliptapColors.error },
  recallAnswer: { borderRadius: fliptapRadii.control, backgroundColor: fliptapColors.navySoft, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  recallAnswerText: { flex: 1, color: fliptapColors.inkBrand, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  revealButton: { minHeight: 48, borderRadius: fliptapRadii.control, borderWidth: 1, borderColor: fliptapColors.borderStrong, backgroundColor: fliptapColors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  revealButtonText: { color: fliptapColors.inkBrand, fontSize: 14, fontWeight: '700' },
  navigationRow: { alignSelf: 'stretch', minHeight: 50, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previousButton: { minWidth: 112, minHeight: 46, borderRadius: fliptapRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  previousText: { color: fliptapColors.muted, fontSize: 14, fontWeight: '700' },
  continueButton: { minWidth: 126, minHeight: 48, paddingHorizontal: 16, borderRadius: fliptapRadii.control, backgroundColor: fliptapColors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  continueText: { color: fliptapColors.surface, fontSize: 15, fontWeight: '800' },
  finalResult: { alignSelf: 'stretch', minHeight: 50, marginTop: 8, borderRadius: fliptapRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  finalResultCorrect: { backgroundColor: fliptapColors.successSoft },
  finalResultIncorrect: { backgroundColor: fliptapColors.errorSoft },
  finalResultText: { fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.36 },
  pressed: { opacity: 0.72 },
})
