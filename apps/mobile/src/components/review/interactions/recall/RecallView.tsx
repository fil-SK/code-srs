import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { RichTextNative } from '@/src/components/text/RichTextNative'
import type { NativeInteractionViewProps } from '../types'

// Recall: the self-graded type. There is no response and nothing to check, so
// the whole interaction is reveal-then-rate and `recallBehavior` carries no
// grader by design.
//
// The card, the flip and the badge are the owner-approved preview design,
// unchanged. What changed is the source: the prompt and answer are the card's
// own RichContent through the shared renderer, where they used to be a
// hand-tokenized lead/inlineCode/tail triple that no real card could produce.

function RecallBadge({ answer = false }: { answer?: boolean }) {
  return (
    <View style={[styles.badge, answer && styles.badgeAnswer]}>
      <MaterialCommunityIcons
        color={answer ? iteraColors.accent : iteraColors.inkBrand}
        name={answer ? 'check-decagram-outline' : 'head-question-outline'}
        size={20}
      />
      <Text style={[styles.badgeText, answer && styles.badgeTextAnswer]}>
        {answer ? 'Answer' : 'Recall'}
      </Text>
    </View>
  )
}

function FlipCue() {
  return (
    <View style={styles.flipCue}>
      <View style={[styles.cueCard, styles.cueCardBack]} />
      <View style={[styles.cueCard, styles.cueCardFront]} />
    </View>
  )
}

export function RecallView({ card, phase, onPrimaryAction }: NativeInteractionViewProps<'recall'>) {
  const rotation = useRef(new Animated.Value(0)).current
  const [reduceMotion, setReduceMotion] = useState(false)
  const revealed = phase.kind !== 'presenting'

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  function flip() {
    if (revealed) return
    if (reduceMotion) {
      onPrimaryAction()
      return
    }
    Animated.timing(rotation, { toValue: 90, duration: 130, useNativeDriver: true }).start(() => {
      onPrimaryAction()
      rotation.setValue(-90)
      Animated.timing(rotation, { toValue: 0, duration: 170, useNativeDriver: true }).start()
    })
  }

  return (
    <Pressable
      accessibilityLabel={revealed ? 'Recall card, answer showing' : 'Recall card, question showing'}
      accessibilityRole="button"
      accessibilityState={{ expanded: revealed }}
      disabled={revealed}
      onPress={flip}
      style={({ pressed }) => [pressed && styles.cardPressed]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { perspective: 900 },
              {
                rotateY: rotation.interpolate({
                  inputRange: [-90, 90],
                  outputRange: ['-90deg', '90deg'],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.face}>
          <RecallBadge answer={revealed} />

          {revealed ? (
            <View style={styles.answerBody}>
              <MaterialCommunityIcons
                color={iteraColors.accent}
                name="lightbulb-on-outline"
                size={34}
              />
              <View style={styles.answerDivider} />
              <RichTextNative style={styles.answerText} text={card.interaction.answer.value} />
            </View>
          ) : (
            <View style={styles.questionBody}>
              <RichTextNative style={styles.questionText} text={card.prompt.value} />
            </View>
          )}

          <View style={styles.flipInstruction}>
            <FlipCue />
            <Text style={styles.flipInstructionText}>
              {revealed ? 'Rate how well you recalled it' : 'Tap the card to reveal the answer'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    minHeight: 520,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    paddingHorizontal: 22,
    paddingVertical: 24,
    ...Platform.select({
      ios: {
        shadowColor: iteraColors.navy,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' },
    }),
  },
  cardPressed: { opacity: 0.96 },
  face: { flex: 1, minHeight: 470, alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.surfaceSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeAnswer: { backgroundColor: iteraColors.accentSofter },
  badgeText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextAnswer: { color: iteraColors.accentActive },
  questionBody: { width: '100%', gap: 22 },
  questionText: {
    color: iteraColors.inkBrand,
    fontSize: 24,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  answerBody: { width: '100%', alignItems: 'center', gap: 18, paddingHorizontal: 4 },
  answerDivider: { width: 78, height: 2, borderRadius: 1, backgroundColor: iteraColors.accent },
  answerText: { color: iteraColors.ink, fontSize: 17, lineHeight: 27 },
  flipInstruction: { alignItems: 'center', gap: 8 },
  flipInstructionText: { color: iteraColors.muted, fontSize: 13, fontWeight: '500' },
  flipCue: { width: 36, height: 29 },
  cueCard: {
    position: 'absolute',
    width: 21,
    height: 27,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: iteraColors.muted,
  },
  cueCardBack: { left: 4, top: 0, transform: [{ rotateZ: '-12deg' }] },
  cueCardFront: {
    right: 4,
    top: 1,
    backgroundColor: iteraColors.surface,
    transform: [{ rotateZ: '9deg' }],
  },
})
