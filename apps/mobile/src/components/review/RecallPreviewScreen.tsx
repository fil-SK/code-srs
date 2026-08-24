import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { Rating } from '@itera/core'
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
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PreviewRatingControls } from '@/src/components/review/PreviewRatingControls'
import { ReviewPreviewHeader } from '@/src/components/review/ReviewPreviewHeader'
import type {
  MobileRecallCodeLine,
  MobileRecallPreviewViewModel,
} from '@/src/types/review'

const codeTone = {
  plain: iteraColors.inkBrand,
  type: '#3a9c35',
  accent: iteraColors.accent,
} as const

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

function CodeBlock({ lines, language }: { lines: MobileRecallCodeLine[]; language: string }) {
  return (
    <View accessibilityLabel={`${language} code example`} style={styles.codeBlock}>
      <Text style={styles.codeLanguage}>{language}</Text>
      {lines.map((line) => (
        <View key={line.number} style={styles.codeLine}>
          <Text style={styles.lineNumber}>{line.number}</Text>
          <Text selectable style={styles.codeText}>
            {line.parts.map((part, index) => (
              <Text key={`${line.number}-${index}`} style={{ color: codeTone[part.tone] }}>
                {part.text}
              </Text>
            ))}
          </Text>
        </View>
      ))}
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

function QuestionFace({ viewModel }: { viewModel: MobileRecallPreviewViewModel }) {
  return (
    <View style={styles.face}>
      <RecallBadge />
      <View style={styles.questionBody}>
        <Text style={styles.questionText}>
          {viewModel.prompt.lead}
          <Text style={styles.inlineCode}>{viewModel.prompt.inlineCode}</Text>
          {viewModel.prompt.tail}
        </Text>
        <CodeBlock language={viewModel.codeLanguage} lines={viewModel.codeLines} />
        <Text style={styles.questionText}>
          {viewModel.prompt.followLead}
          <Text style={styles.inlineCode}>{viewModel.prompt.followCode}</Text>
          {viewModel.prompt.followTail}
        </Text>
      </View>
      <View style={styles.flipInstruction}>
        <FlipCue />
        <Text style={styles.flipInstructionText}>Tap the card to reveal the answer</Text>
      </View>
    </View>
  )
}

function AnswerFace({ viewModel }: { viewModel: MobileRecallPreviewViewModel }) {
  return (
    <View style={styles.face}>
      <RecallBadge answer />
      <View style={styles.answerBody}>
        <MaterialCommunityIcons color={iteraColors.accent} name="lightbulb-on-outline" size={34} />
        <Text style={styles.answerLead}>
          {viewModel.answer.lead}
          <Text style={styles.inlineCode}>{viewModel.answer.inlineCode}</Text>
          {viewModel.answer.tail}
        </Text>
        <View style={styles.answerDivider} />
        <Text style={styles.answerDetail}>{viewModel.answer.detail}</Text>
      </View>
      <View style={styles.flipInstruction}>
        <FlipCue />
        <Text style={styles.flipInstructionText}>Tap the card to see the question</Text>
      </View>
    </View>
  )
}

function TipPanel({ tip }: { tip: MobileRecallPreviewViewModel['tip'] }) {
  return (
    <View style={styles.tipPanel}>
      <View style={styles.tipIcon}>
        <MaterialCommunityIcons color={iteraColors.accent} name="lightbulb-outline" size={24} />
      </View>
      <View style={styles.tipCopy}>
        <Text style={styles.tipTitle}>Tip (optional)</Text>
        <Text style={styles.tipText}>
          <Text style={styles.inlineCodeSmall}>{tip.leadCode}</Text>
          {tip.text}
        </Text>
      </View>
    </View>
  )
}

export function RecallPreviewScreen({ viewModel }: { viewModel: MobileRecallPreviewViewModel }) {
  const router = useRouter()
  const rotation = useRef(new Animated.Value(0)).current
  const [flipped, setFlipped] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  function flipCard() {
    if (animating) return
    if (reduceMotion) {
      setFlipped((value) => !value)
      rotation.setValue(0)
      return
    }
    setAnimating(true)
    Animated.timing(rotation, {
      toValue: 90,
      duration: 130,
      useNativeDriver: true,
    }).start(() => {
      setFlipped((value) => !value)
      rotation.setValue(-90)
      Animated.timing(rotation, {
        toValue: 0,
        duration: 170,
        useNativeDriver: true,
      }).start(() => setAnimating(false))
    })
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ReviewPreviewHeader
        current={viewModel.current}
        exitLabel="Exit Recall preview"
        hint="Tap to flip"
        hintIcon="gesture-tap"
        onExit={() => router.replace('/today')}
        total={viewModel.total}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel={flipped ? 'Recall card, answer showing' : 'Recall card, question showing'}
          accessibilityRole="button"
          accessibilityState={{ expanded: flipped }}
          onPress={flipCard}
          style={({ pressed }) => [pressed && styles.cardPressed]}
        >
          <Animated.View
            style={[
              styles.card,
              { transform: [{ perspective: 900 }, { rotateY: rotation.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }] },
            ]}
          >
            {flipped ? <AnswerFace viewModel={viewModel} /> : <QuestionFace viewModel={viewModel} />}
          </Animated.View>
        </Pressable>

        {!flipped && <TipPanel tip={viewModel.tip} />}
        {flipped && (
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
  card: { minHeight: 520, borderRadius: 20, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, paddingHorizontal: 22, paddingVertical: 24, ...Platform.select({ ios: { shadowColor: iteraColors.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 18 }, android: { elevation: 4 }, web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' } }) },
  cardPressed: { opacity: 0.96 },
  face: { flex: 1, minHeight: 470, alignItems: 'center', justifyContent: 'space-between' },
  badge: { minHeight: 42, paddingHorizontal: 16, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeAnswer: { backgroundColor: iteraColors.accentSofter },
  badgeText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextAnswer: { color: iteraColors.accentActive },
  questionBody: { width: '100%', gap: 22 },
  questionText: { color: iteraColors.inkBrand, fontSize: 24, lineHeight: 33, fontWeight: '700', letterSpacing: -0.35 },
  inlineCode: { color: iteraColors.accent, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontWeight: '700' },
  inlineCodeSmall: { color: iteraColors.accent, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 15 },
  codeBlock: { width: '100%', borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surfaceSubtle, paddingHorizontal: 14, paddingTop: 24, paddingBottom: 12, gap: 9 },
  codeLanguage: { position: 'absolute', top: 6, right: 10, color: iteraColors.mutedLight, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  codeLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  lineNumber: { width: 14, color: iteraColors.mutedLight, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12, lineHeight: 20, textAlign: 'right' },
  codeText: { flex: 1, color: iteraColors.inkBrand, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12.5, lineHeight: 20 },
  flipInstruction: { alignItems: 'center', gap: 8 },
  flipInstructionText: { color: iteraColors.muted, fontSize: 13, fontWeight: '500' },
  flipCue: { width: 36, height: 29 },
  cueCard: { position: 'absolute', width: 21, height: 27, borderRadius: 3, borderWidth: 1.5, borderColor: iteraColors.muted },
  cueCardBack: { left: 4, top: 0, transform: [{ rotateZ: '-12deg' }] },
  cueCardFront: { right: 4, top: 1, backgroundColor: iteraColors.surface, transform: [{ rotateZ: '9deg' }] },
  answerBody: { width: '100%', alignItems: 'center', gap: 18, paddingHorizontal: 4 },
  answerLead: { color: iteraColors.inkBrand, fontSize: 24, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
  answerDivider: { width: 78, height: 2, borderRadius: 1, backgroundColor: iteraColors.accent },
  answerDetail: { color: iteraColors.muted, fontSize: 17, lineHeight: 27, textAlign: 'center' },
  tipPanel: { borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  tipIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: iteraColors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  tipCopy: { flex: 1, gap: 5 },
  tipTitle: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  tipText: { color: iteraColors.muted, fontSize: 15, lineHeight: 23 },
  pressed: { opacity: 0.68 },
})
