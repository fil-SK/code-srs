import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors, iteraRadii } from '@itera/core'
import type { Rating } from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
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

import type {
  MobileRecallCodeLine,
  MobileRecallPreviewViewModel,
} from '@/src/types/review'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const ratingPresentation: {
  rating: Rating
  label: string
  icon: IconName
  accent: string
}[] = [
  { rating: 1, label: 'Again', icon: 'refresh', accent: '#ef4444' },
  { rating: 2, label: 'Hard', icon: 'chart-bar', accent: '#f59e0b' },
  { rating: 3, label: 'Good', icon: 'check-circle-outline', accent: '#65a30d' },
  { rating: 4, label: 'Easy', icon: 'chevron-double-right', accent: '#2563eb' },
]

const codeTone = {
  plain: iteraColors.inkBrand,
  type: '#3a9c35',
  accent: iteraColors.accent,
} as const

function ReviewHeader({
  current,
  total,
  onExit,
}: {
  current: number
  total: number
  onExit: () => void
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Exit Recall preview"
        accessibilityRole="button"
        hitSlop={6}
        onPress={onExit}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons color={iteraColors.inkBrand} name="chevron-left" size={29} />
      </Pressable>

      <View accessibilityLabel={`Card ${current} of ${total}`} style={styles.progressWrap}>
        <Text style={styles.progressLabel}>{current} of {total}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(current / total) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.tapHint}>
        <MaterialCommunityIcons color={iteraColors.muted} name="gesture-tap" size={18} />
        <Text style={styles.tapHintText}>Tap to flip</Text>
      </View>
    </View>
  )
}

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

function RatingPreview({
  intervals,
  selected,
  onSelect,
}: {
  intervals: MobileRecallPreviewViewModel['ratingIntervals']
  selected: Rating | null
  onSelect: (rating: Rating) => void
}) {
  return (
    <View>
      <Text style={styles.ratingHeading}>How well did you recall it?</Text>
      <View style={styles.ratingGrid}>
        {ratingPresentation.map((item) => {
          const isSelected = selected === item.rating
          return (
            <Pressable
              key={item.rating}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${item.label}, ${intervals[item.rating]}`}
              onPress={() => onSelect(item.rating)}
              style={({ pressed }) => [
                styles.ratingButton,
                isSelected && styles.ratingButtonSelected,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={isSelected ? iteraColors.accent : iteraColors.muted}
                name={item.icon}
                size={24}
              />
              <Text style={styles.ratingLabel}>{item.label}</Text>
              <Text style={styles.ratingInterval}>{item.rating} • {intervals[item.rating]}</Text>
              <View style={[styles.ratingAccent, { backgroundColor: item.accent }]} />
            </Pressable>
          )
        })}
      </View>
      <Text style={styles.previewNote}>Preview only. Ratings are not saved.</Text>
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
      <ReviewHeader
        current={viewModel.current}
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
          <RatingPreview
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
  header: { minHeight: 86, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 46, height: 46, borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { position: 'absolute', left: '32%', right: '32%', alignItems: 'center', gap: 8 },
  progressLabel: { color: iteraColors.inkBrand, fontSize: 18, fontWeight: '700' },
  progressTrack: { width: '100%', height: 5, overflow: 'hidden', borderRadius: iteraRadii.pill, backgroundColor: iteraColors.border },
  progressFill: { height: '100%', borderRadius: iteraRadii.pill, backgroundColor: iteraColors.accent },
  tapHint: { minWidth: 84, alignItems: 'center', gap: 2 },
  tapHintText: { color: iteraColors.muted, fontSize: 12, fontWeight: '600' },
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
  ratingHeading: { marginBottom: 10, color: iteraColors.inkBrand, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  ratingGrid: { flexDirection: 'row', gap: 8 },
  ratingButton: { flex: 1, minHeight: 118, overflow: 'hidden', borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
  ratingButtonSelected: { borderColor: iteraColors.accent, backgroundColor: iteraColors.accentSofter },
  ratingLabel: { color: iteraColors.inkBrand, fontSize: 14, fontWeight: '700' },
  ratingInterval: { color: iteraColors.muted, fontSize: 11 },
  ratingAccent: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  previewNote: { marginTop: 9, color: iteraColors.muted, fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.68 },
})
