import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  gradeOrdering,
  iteraColors,
  iteraRadii,
  orderingBehavior,
} from '@itera/core'
import type { ID, OrderingGrade, Rating } from '@itera/core'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
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
import type { MobileOrderingPreviewViewModel } from '@/src/types/review'

const DRAG_ROW_STEP = 82

function OrderingBadge({ results = false }: { results?: boolean }) {
  return (
    <View style={[styles.badge, results && styles.badgeResults]}>
      <MaterialCommunityIcons
        color={results ? iteraColors.accent : iteraColors.inkBrand}
        name={results ? 'check-decagram-outline' : 'format-list-numbered'}
        size={21}
      />
      <Text style={[styles.badgeText, results && styles.badgeTextResults]}>
        {results ? 'Results' : 'Ordering'}
      </Text>
    </View>
  )
}

function Prompt({ prompt }: { prompt: MobileOrderingPreviewViewModel['prompt'] }) {
  return (
    <Text style={styles.prompt}>
      {prompt.lead}
      <Text style={styles.inlineCode}>{prompt.firstCode}</Text>
      {prompt.middle}
      <Text style={styles.inlineCode}>{prompt.secondCode}</Text>
      {prompt.tail}
    </Text>
  )
}

function OrderingItemText({ content }: { content: string }) {
  const code = 'size() == capacity()'
  if (!content.includes(code)) return <Text style={styles.itemText}>{content}</Text>
  const [lead, tail] = content.split(code)
  return (
    <Text style={styles.itemText}>
      {lead}<Text style={styles.itemCode}>{code}</Text>{tail}
    </Text>
  )
}

function GripDots() {
  return (
    <View pointerEvents="none" style={styles.gripDots}>
      {Array.from({ length: 12 }, (_, index) => <View key={index} style={styles.gripDot} />)}
    </View>
  )
}

function OrderingRow({
  id,
  content,
  index,
  total,
  locked,
  feedback,
  onMove,
  onDragStateChange,
  onPreviewTarget,
}: {
  id: ID
  content: string
  index: number
  total: number
  locked: boolean
  feedback?: { correct: boolean; expectedIndex: number }
  onMove: (id: ID, targetIndex: number) => void
  onDragStateChange: (dragging: boolean, id: ID, index: number) => void
  onPreviewTarget: (id: ID, targetIndex: number) => void
}) {
  const translateY = useRef(new Animated.Value(0)).current
  const [dragging, setDragging] = useState(false)
  const responder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => !locked,
      onStartShouldSetPanResponderCapture: () => !locked,
      onMoveShouldSetPanResponder: (_, gesture) => !locked && Math.abs(gesture.dy) > 3,
      onMoveShouldSetPanResponderCapture: (_, gesture) => !locked && Math.abs(gesture.dy) > 3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setDragging(true)
        onDragStateChange(true, id, index)
      },
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(gesture.dy)
        const offset = Math.round(gesture.dy / DRAG_ROW_STEP)
        onPreviewTarget(id, Math.max(0, Math.min(total - 1, index + offset)))
      },
      onPanResponderRelease: (_, gesture) => {
        const offset = Math.round(gesture.dy / DRAG_ROW_STEP)
        const target = Math.max(0, Math.min(total - 1, index + offset))
        // Preserve the held row's exact screen position while React swaps it
        // into the destination slot. Only the small distance left between the
        // finger and that slot is animated away after the layout update.
        const landingOffset = gesture.dy - (target - index) * DRAG_ROW_STEP
        translateY.setValue(landingOffset)
        setDragging(false)
        if (target !== index) onMove(id, target)
        onDragStateChange(false, id, index)
        requestAnimationFrame(() => {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 20,
            stiffness: 240,
            mass: 0.7,
            useNativeDriver: true,
          }).start()
        })
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
        setDragging(false)
        onDragStateChange(false, id, index)
      },
    }),
    [id, index, locked, onDragStateChange, onMove, onPreviewTarget, total, translateY],
  )

  const action = (name: string) => {
    if (name === 'increment') onMove(id, Math.min(total - 1, index + 1))
    if (name === 'decrement') onMove(id, Math.max(0, index - 1))
  }

  return (
    <Animated.View
      style={[
        styles.itemRow,
        dragging && styles.itemRowDragging,
        feedback?.correct && styles.itemRowCorrect,
        feedback && !feedback.correct && styles.itemRowIncorrect,
        dragging && { top: index * DRAG_ROW_STEP },
        { transform: [{ translateY }] },
      ]}
    >
      {feedback && <Text style={styles.positionNumber}>{index + 1}.</Text>}
      <View style={styles.itemCopy}><OrderingItemText content={content} /></View>
      {feedback ? (
        <View style={styles.feedbackState}>
          <MaterialCommunityIcons
            color={feedback.correct ? iteraColors.success : iteraColors.error}
            name={feedback.correct ? 'check' : 'close'}
            size={16}
          />
          <Text style={[styles.feedbackText, feedback.correct ? styles.correctText : styles.incorrectText]}>
            {feedback.correct ? 'Correct' : `#${feedback.expectedIndex + 1}`}
          </Text>
        </View>
      ) : (
        <View
          accessible
          accessibilityActions={[
            { name: 'decrement', label: 'Move up' },
            { name: 'increment', label: 'Move down' },
          ]}
          accessibilityLabel={`${content}, position ${index + 1} of ${total}`}
          accessibilityRole="adjustable"
          accessibilityValue={{ min: 1, max: total, now: index + 1 }}
          onAccessibilityAction={(event) => action(event.nativeEvent.actionName)}
          style={styles.grip}
          {...responder.panHandlers}
        >
          <GripDots />
        </View>
      )}
    </Animated.View>
  )
}

function CorrectOrder({
  order,
  itemById,
}: {
  order: ID[]
  itemById: Map<ID, string>
}) {
  return (
    <View style={styles.correctOrder}>
      <Text style={styles.correctOrderLabel}>CORRECT ORDER</Text>
      {order.map((id, index) => (
        <View key={id} style={styles.correctOrderRow}>
          <Text style={styles.correctOrderNumber}>{index + 1}</Text>
          <Text style={styles.correctOrderText}>{itemById.get(id)}</Text>
        </View>
      ))}
    </View>
  )
}

export function OrderingPreviewScreen({ viewModel }: { viewModel: MobileOrderingPreviewViewModel }) {
  const router = useRouter()
  const rotation = useRef(new Animated.Value(0)).current
  const [order, setOrder] = useState<ID[]>(viewModel.initialOrder)
  const [grade, setGrade] = useState<OrderingGrade | null>(null)
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [draggingItem, setDraggingItem] = useState(false)
  const [dragPreview, setDragPreview] = useState<{ id: ID; targetIndex: number } | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const itemById = useMemo(
    () => new Map(viewModel.interaction.items.map((item) => [item.id, item.content.value])),
    [viewModel.interaction.items],
  )
  const responseReady = orderingBehavior.isResponseReady?.(order, viewModel.interaction) ?? false

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  const moveItem = useCallback((id: ID, targetIndex: number) => {
    setOrder((current) => {
      const from = current.indexOf(id)
      if (from < 0 || from === targetIndex) return current
      const next = [...current]
      next.splice(from, 1)
      next.splice(targetIndex, 0, id)
      setAnnouncement(`${itemById.get(id)} moved to position ${targetIndex + 1} of ${next.length}`)
      return next
    })
  }, [itemById])

  const changeDragState = useCallback((dragging: boolean, id: ID, index: number) => {
    setDraggingItem(dragging)
    setDragPreview(dragging ? { id, targetIndex: index } : null)
  }, [])

  const previewTarget = useCallback((id: ID, targetIndex: number) => {
    setDragPreview((current) => {
      if (current?.id === id && current.targetIndex === targetIndex) return current
      return { id, targetIndex }
    })
  }, [])

  function submit() {
    if (!responseReady || grade) return
    const nextGrade = gradeOrdering(viewModel.interaction, order)
    if (reduceMotion) {
      setGrade(nextGrade)
      return
    }
    Animated.timing(rotation, { toValue: 90, duration: 130, useNativeDriver: true }).start(() => {
      setGrade(nextGrade)
      rotation.setValue(-90)
      Animated.timing(rotation, { toValue: 0, duration: 170, useNativeDriver: true }).start()
    })
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ReviewPreviewHeader
        current={viewModel.current}
        exitLabel="Exit Ordering preview"
        hint={grade ? 'Results' : 'Drag to reorder'}
        hintIcon={grade ? 'check-decagram-outline' : 'drag-vertical'}
        onExit={() => router.replace('/today')}
        total={viewModel.total}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!draggingItem}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            { transform: [{ perspective: 900 }, { rotateY: rotation.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }] },
          ]}
        >
          <OrderingBadge results={Boolean(grade)} />
          <Prompt prompt={viewModel.prompt} />
          {!grade && <Text style={styles.instruction}>Drag the handles to reorder the steps.</Text>}
          <Text accessibilityLiveRegion="polite" style={styles.srOnly}>{announcement}</Text>
          <View style={styles.items}>
            {(() => {
              const rows = []
              let normalIndex = 0
              for (let index = 0; index < order.length; index++) {
                const id = order[index]
                const active = dragPreview?.id === id
                if (!active && dragPreview && normalIndex === dragPreview.targetIndex) {
                  rows.push(
                    <View key="drop-slot" style={styles.dropSlot}>
                      <Text style={styles.dropSlotText}>Release here</Text>
                    </View>,
                  )
                }
              const position = grade?.positions.find((item) => item.itemId === id)
                rows.push(
                <OrderingRow
                  key={id}
                  content={itemById.get(id) ?? ''}
                  feedback={grade ? { correct: position?.correct ?? false, expectedIndex: position?.correctIndex ?? index } : undefined}
                  id={id}
                  index={index}
                  locked={Boolean(grade)}
                  onDragStateChange={changeDragState}
                  onMove={moveItem}
                  onPreviewTarget={previewTarget}
                  total={order.length}
                  />,
                )
                if (!active) normalIndex++
              }
              if (dragPreview && normalIndex === dragPreview.targetIndex) {
                rows.push(
                  <View key="drop-slot" style={styles.dropSlot}>
                    <Text style={styles.dropSlotText}>Release here</Text>
                  </View>,
                )
              }
              return rows
            })()}
          </View>

          {!grade ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !responseReady }}
              disabled={!responseReady}
              onPress={submit}
              style={({ pressed }) => [styles.submit, pressed && styles.pressed]}
            >
              <Text style={styles.submitText}>Submit answer</Text>
            </Pressable>
          ) : (
            <>
              <View style={[styles.summary, grade.correct ? styles.summaryCorrect : styles.summaryIncorrect]}>
                <MaterialCommunityIcons
                  color={grade.correct ? iteraColors.success : iteraColors.error}
                  name={grade.correct ? 'check-circle-outline' : 'alert-circle-outline'}
                  size={20}
                />
                <Text style={[styles.summaryText, grade.correct ? styles.correctText : styles.incorrectText]}>
                  {grade.correct ? 'Correct order' : `${Math.round(grade.score * 100)}% in the right position`}
                </Text>
              </View>
              {!grade.correct && <CorrectOrder itemById={itemById} order={viewModel.interaction.correctOrder} />}
            </>
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
  card: { borderRadius: 20, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, padding: 18, alignItems: 'center', ...Platform.select({ ios: { shadowColor: iteraColors.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 18 }, android: { elevation: 4 }, web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' } }) },
  badge: { minHeight: 42, paddingHorizontal: 16, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeResults: { backgroundColor: iteraColors.accentSofter },
  badgeText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextResults: { color: iteraColors.accentActive },
  prompt: { marginTop: 22, color: iteraColors.inkBrand, fontSize: 23, lineHeight: 33, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  inlineCode: { color: iteraColors.accent, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontWeight: '700' },
  instruction: { marginTop: 9, color: iteraColors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  items: { width: '100%', marginTop: 22, gap: 10 },
  itemRow: { minHeight: 72, borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, paddingLeft: 15, flexDirection: 'row', alignItems: 'center', shadowColor: iteraColors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  itemRowDragging: { position: 'absolute', left: 0, right: 0, zIndex: 10, elevation: 8, borderColor: iteraColors.accent, shadowOpacity: 0.15, shadowRadius: 10 },
  dropSlot: { minHeight: 64, borderRadius: iteraRadii.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: iteraColors.accent, backgroundColor: iteraColors.accentSofter, alignItems: 'center', justifyContent: 'center' },
  dropSlotText: { color: iteraColors.accentActive, fontSize: 12, fontWeight: '700' },
  itemRowCorrect: { borderColor: '#86c99b', backgroundColor: iteraColors.successSoft },
  itemRowIncorrect: { borderColor: '#e1a29e', backgroundColor: iteraColors.errorSoft },
  itemCopy: { flex: 1, paddingVertical: 13 },
  itemText: { color: iteraColors.inkBrand, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  itemCode: { color: iteraColors.accent, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 14 },
  grip: { width: 50, minHeight: 70, alignItems: 'center', justifyContent: 'center' },
  gripDots: { width: 23, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gripDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: iteraColors.mutedLight },
  positionNumber: { width: 24, color: iteraColors.muted, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12 },
  feedbackState: { width: 65, paddingRight: 10, alignItems: 'center', gap: 2 },
  feedbackText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  correctText: { color: iteraColors.success },
  incorrectText: { color: iteraColors.error },
  submit: { width: '100%', minHeight: 54, marginTop: 20, borderRadius: iteraRadii.control, backgroundColor: iteraColors.accent, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: iteraColors.surface, fontSize: 17, fontWeight: '700' },
  summary: { width: '100%', minHeight: 48, marginTop: 18, borderRadius: iteraRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  summaryCorrect: { backgroundColor: iteraColors.successSoft },
  summaryIncorrect: { backgroundColor: iteraColors.errorSoft },
  summaryText: { fontSize: 14, fontWeight: '700' },
  correctOrder: { width: '100%', marginTop: 12, borderRadius: iteraRadii.control, borderWidth: 1, borderStyle: 'dashed', borderColor: iteraColors.borderStrong, padding: 14, gap: 8 },
  correctOrderLabel: { color: iteraColors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  correctOrderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  correctOrderNumber: { width: 20, color: iteraColors.accent, fontSize: 12, fontWeight: '700' },
  correctOrderText: { flex: 1, color: iteraColors.inkBrand, fontSize: 13, lineHeight: 18 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  pressed: { opacity: 0.72 },
})
