import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { gradeOrdering, iteraColors, iteraRadii, stripInlineMarkers, type ID } from '@itera/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { RichInlineNative, RichTextNative } from '@/src/components/text/RichTextNative'
import type { NativeInteractionViewProps } from '../types'

// Ordering. Readiness and partial credit come from orderingBehavior and
// gradeOrdering; this View owns only how a phone reorders a list.
//
// Two things changed when it stopped being a fixture screen:
//
//  1. Row heights are measured rather than assumed. The preview hard-coded an
//     82px step, which was true of the five short fixture items and false of
//     any real card - a wrapping item made every drop land on the wrong index.
//  2. Up and down controls are always visible (master plan D7). Web's keyboard
//     drag is Space-arrows-Space; native has no equivalent, so the buttons are
//     the accessible path and are never hidden behind a gesture.

const FALLBACK_ROW_HEIGHT = 72
const ROW_GAP = 10

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

function GripDots() {
  return (
    <View pointerEvents="none" style={styles.gripDots}>
      {Array.from({ length: 12 }, (_, index) => (
        <View key={index} style={styles.gripDot} />
      ))}
    </View>
  )
}

/** Cumulative distance from the top of the list to the top of `index`. */
function offsetOf(order: ID[], index: number, heightOf: (id: ID) => number): number {
  let offset = 0
  for (let i = 0; i < index; i++) offset += heightOf(order[i]) + ROW_GAP
  return offset
}

/**
 * Where a row dragged by `dy` should land, walking real row heights rather than
 * dividing by an assumed constant.
 */
function targetIndexFor(
  order: ID[],
  from: number,
  dy: number,
  heightOf: (id: ID) => number,
): number {
  let target = from
  let remaining = dy

  while (remaining > 0 && target < order.length - 1) {
    const next = heightOf(order[target + 1]) + ROW_GAP
    if (remaining <= next / 2) break
    remaining -= next
    target++
  }
  while (remaining < 0 && target > 0) {
    const previous = heightOf(order[target - 1]) + ROW_GAP
    if (-remaining <= previous / 2) break
    remaining += previous
    target--
  }

  return target
}

function OrderingRow({
  id,
  content,
  index,
  total,
  locked,
  feedback,
  heightOf,
  order,
  onMeasure,
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
  heightOf: (id: ID) => number
  order: ID[]
  onMeasure: (id: ID, height: number) => void
  onMove: (id: ID, targetIndex: number) => void
  onDragStateChange: (dragging: boolean, id: ID, index: number) => void
  onPreviewTarget: (id: ID, targetIndex: number) => void
}) {
  const translateY = useRef(new Animated.Value(0)).current
  const [dragging, setDragging] = useState(false)

  const responder = useMemo(
    () =>
      PanResponder.create({
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
          onPreviewTarget(id, targetIndexFor(order, index, gesture.dy, heightOf))
        },
        onPanResponderRelease: (_, gesture) => {
          const target = targetIndexFor(order, index, gesture.dy, heightOf)
          // Preserve the held row's exact screen position while React swaps it
          // into the destination slot. Only the small distance left between the
          // finger and that slot is animated away after the layout update.
          const landingOffset =
            gesture.dy - (offsetOf(order, target, heightOf) - offsetOf(order, index, heightOf))
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
    [heightOf, id, index, locked, onDragStateChange, onMove, onPreviewTarget, order, translateY],
  )

  const label = stripInlineMarkers(content)

  return (
    <Animated.View
      onLayout={(event) => onMeasure(id, event.nativeEvent.layout.height)}
      style={[
        styles.itemRow,
        dragging && styles.itemRowDragging,
        feedback?.correct && styles.itemRowCorrect,
        feedback && !feedback.correct && styles.itemRowIncorrect,
        dragging && { top: offsetOf(order, index, heightOf) },
        { transform: [{ translateY }] },
      ]}
    >
      {feedback && <Text style={styles.positionNumber}>{index + 1}.</Text>}
      <View style={styles.itemCopy}>
        <RichInlineNative style={styles.itemText} text={content} />
      </View>

      {feedback ? (
        <View style={styles.feedbackState}>
          <MaterialCommunityIcons
            color={feedback.correct ? iteraColors.success : iteraColors.error}
            name={feedback.correct ? 'check' : 'close'}
            size={16}
          />
          <Text
            style={[
              styles.feedbackText,
              feedback.correct ? styles.correctText : styles.incorrectText,
            ]}
          >
            {feedback.correct ? 'Correct' : `#${feedback.expectedIndex + 1}`}
          </Text>
        </View>
      ) : (
        <View style={styles.controls}>
          <View style={styles.arrows}>
            <Pressable
              accessibilityLabel={`Move ${label} up`}
              accessibilityRole="button"
              accessibilityState={{ disabled: index === 0 }}
              disabled={index === 0}
              hitSlop={4}
              onPress={() => onMove(id, index - 1)}
              style={({ pressed }) => [
                styles.arrowButton,
                index === 0 && styles.arrowDisabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={iteraColors.inkBrand}
                name="chevron-up"
                size={22}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={`Move ${label} down`}
              accessibilityRole="button"
              accessibilityState={{ disabled: index === total - 1 }}
              disabled={index === total - 1}
              hitSlop={4}
              onPress={() => onMove(id, index + 1)}
              style={({ pressed }) => [
                styles.arrowButton,
                index === total - 1 && styles.arrowDisabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                color={iteraColors.inkBrand}
                name="chevron-down"
                size={22}
              />
            </Pressable>
          </View>

          <View
            accessible
            accessibilityLabel={`${label}, position ${index + 1} of ${total}. Drag to reorder.`}
            accessibilityRole="adjustable"
            accessibilityValue={{ min: 1, max: total, now: index + 1 }}
            style={styles.grip}
            {...responder.panHandlers}
          >
            <GripDots />
          </View>
        </View>
      )}
    </Animated.View>
  )
}

function CorrectOrder({ order, itemById }: { order: ID[]; itemById: Map<ID, string> }) {
  return (
    <View style={styles.correctOrder}>
      <Text style={styles.correctOrderLabel}>CORRECT ORDER</Text>
      {order.map((id, index) => (
        <View key={id} style={styles.correctOrderRow}>
          <Text style={styles.correctOrderNumber}>{index + 1}</Text>
          <RichInlineNative style={styles.correctOrderText} text={itemById.get(id) ?? ''} />
        </View>
      ))}
    </View>
  )
}

export function OrderingView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
  responseReady,
  setScrollEnabled,
}: NativeInteractionViewProps<'ordering'>) {
  const interaction = card.interaction
  const [announcement, setAnnouncement] = useState('')
  const [dragPreview, setDragPreview] = useState<{ id: ID; targetIndex: number } | null>(null)
  const heights = useRef(new Map<ID, number>())

  const itemById = useMemo(
    () => new Map(interaction.items.map((item) => [item.id, item.content.value])),
    [interaction.items],
  )

  // The presented order. Randomised once per mount when the card asks for it,
  // and never reshuffled on a re-render.
  const [initialOrder] = useState<ID[]>(() => {
    const ids = interaction.items.map((item) => item.id)
    if (!interaction.randomize) return ids
    // A deterministic rotation rather than a shuffle: the demo has to be
    // reproducible for a recording, and a rotation is guaranteed to differ from
    // the correct order for any list longer than one.
    return [...ids.slice(1), ids[0]]
  })

  const order = Array.isArray(response) ? (response as ID[]) : initialOrder
  const submitted = phase.kind !== 'presenting' && phase.kind !== 'submitting'
  const grade = submitted ? gradeOrdering(interaction, order) : null

  // Seed the response with the presented order once. Without this, a learner
  // who agrees with the order as shown has made no "response" as far as
  // orderingBehavior is concerned, and Submit stays disabled forever - agreeing
  // is an answer.
  useEffect(() => {
    if (!Array.isArray(response)) setResponse(initialOrder)
    // Mount-only: the session remounts this tree per card (key={card.id}).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const heightOf = useCallback(
    (id: ID) => heights.current.get(id) ?? FALLBACK_ROW_HEIGHT,
    [],
  )

  const measure = useCallback((id: ID, height: number) => {
    heights.current.set(id, height)
  }, [])

  const moveItem = useCallback(
    (id: ID, rawTarget: number) => {
      const from = order.indexOf(id)
      const target = Math.max(0, Math.min(order.length - 1, rawTarget))
      if (from < 0 || from === target) return
      const next = [...order]
      next.splice(from, 1)
      next.splice(target, 0, id)
      setAnnouncement(
        `${stripInlineMarkers(itemById.get(id) ?? '')} moved to position ${target + 1} of ${next.length}`,
      )
      setResponse(next)
    },
    [itemById, order, setResponse],
  )

  const changeDragState = useCallback(
    (dragging: boolean, id: ID, index: number) => {
      setDragPreview(dragging ? { id, targetIndex: index } : null)
      // The session's scroll view and this drag want the same vertical gesture.
      setScrollEnabled(!dragging)
    },
    [setScrollEnabled],
  )

  const previewTarget = useCallback((id: ID, targetIndex: number) => {
    setDragPreview((current) => {
      if (current?.id === id && current.targetIndex === targetIndex) return current
      return { id, targetIndex }
    })
  }, [])

  function submit() {
    if (!responseReady || submitted) return
    onPrimaryAction()
  }

  const rows: React.ReactNode[] = []
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
        feedback={
          grade
            ? { correct: position?.correct ?? false, expectedIndex: position?.correctIndex ?? index }
            : undefined
        }
        heightOf={heightOf}
        id={id}
        index={index}
        locked={submitted}
        onDragStateChange={changeDragState}
        onMeasure={measure}
        onMove={moveItem}
        onPreviewTarget={previewTarget}
        order={order}
        total={order.length}
      />,
    )
    if (!active) normalIndex++
  }
  if (dragPreview && normalIndex === dragPreview.targetIndex) {
    rows.push(
      <View key="drop-slot-end" style={styles.dropSlot}>
        <Text style={styles.dropSlotText}>Release here</Text>
      </View>,
    )
  }

  return (
    <View style={styles.card}>
      <OrderingBadge results={submitted} />
      <RichTextNative style={styles.prompt} text={card.prompt.value} />
      {!submitted && (
        <Text style={styles.instruction}>
          Drag the handle, or use the arrows, to reorder the steps.
        </Text>
      )}
      <Text accessibilityLiveRegion="polite" style={styles.srOnly}>
        {announcement}
      </Text>

      <View style={styles.items}>{rows}</View>

      {!submitted ? (
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
          <View
            style={[
              styles.summary,
              grade?.correct ? styles.summaryCorrect : styles.summaryIncorrect,
            ]}
          >
            <MaterialCommunityIcons
              color={grade?.correct ? iteraColors.success : iteraColors.error}
              name={grade?.correct ? 'check-circle-outline' : 'alert-circle-outline'}
              size={20}
            />
            <Text
              style={[
                styles.summaryText,
                grade?.correct ? styles.correctText : styles.incorrectText,
              ]}
            >
              {grade?.correct
                ? 'Correct order'
                : `${Math.round((grade?.score ?? 0) * 100)}% in the right position`}
            </Text>
          </View>
          {!grade?.correct && <CorrectOrder itemById={itemById} order={interaction.correctOrder} />}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    padding: 18,
    alignItems: 'center',
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
  badge: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: iteraRadii.pill,
    backgroundColor: iteraColors.surfaceSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeResults: { backgroundColor: iteraColors.accentSofter },
  badgeText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextResults: { color: iteraColors.accentActive },
  prompt: {
    marginTop: 22,
    color: iteraColors.inkBrand,
    fontSize: 23,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  instruction: {
    marginTop: 9,
    color: iteraColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  items: { width: '100%', marginTop: 22, gap: ROW_GAP },
  itemRow: {
    minHeight: FALLBACK_ROW_HEIGHT,
    borderRadius: iteraRadii.card,
    borderWidth: 1,
    borderColor: iteraColors.border,
    backgroundColor: iteraColors.surface,
    paddingLeft: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: iteraColors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  itemRowDragging: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 8,
    borderColor: iteraColors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  dropSlot: {
    minHeight: 64,
    borderRadius: iteraRadii.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: iteraColors.accent,
    backgroundColor: iteraColors.accentSofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropSlotText: { color: iteraColors.accentActive, fontSize: 12, fontWeight: '700' },
  itemRowCorrect: { borderColor: '#86c99b', backgroundColor: iteraColors.successSoft },
  itemRowIncorrect: { borderColor: '#e1a29e', backgroundColor: iteraColors.errorSoft },
  itemCopy: { flex: 1, paddingVertical: 13, paddingRight: 6 },
  itemText: { color: iteraColors.inkBrand, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center' },
  arrows: { width: 38, alignItems: 'center', justifyContent: 'center' },
  arrowButton: {
    width: 38,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  arrowDisabled: { opacity: 0.25 },
  grip: { width: 46, minHeight: 70, alignItems: 'center', justifyContent: 'center' },
  gripDots: { width: 23, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gripDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: iteraColors.mutedLight },
  positionNumber: {
    width: 24,
    color: iteraColors.muted,
    fontSize: 12,
  },
  feedbackState: { width: 65, paddingRight: 10, alignItems: 'center', gap: 2 },
  feedbackText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  correctText: { color: iteraColors.success },
  incorrectText: { color: iteraColors.error },
  submit: {
    width: '100%',
    minHeight: 54,
    marginTop: 20,
    borderRadius: iteraRadii.control,
    backgroundColor: iteraColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: iteraColors.surface, fontSize: 17, fontWeight: '700' },
  summary: {
    width: '100%',
    minHeight: 48,
    marginTop: 18,
    borderRadius: iteraRadii.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  summaryCorrect: { backgroundColor: iteraColors.successSoft },
  summaryIncorrect: { backgroundColor: iteraColors.errorSoft },
  summaryText: { fontSize: 14, fontWeight: '700' },
  correctOrder: {
    width: '100%',
    marginTop: 12,
    borderRadius: iteraRadii.control,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: iteraColors.borderStrong,
    padding: 14,
    gap: 8,
  },
  correctOrderLabel: { color: iteraColors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  correctOrderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  correctOrderNumber: { width: 20, color: iteraColors.accent, fontSize: 12, fontWeight: '700' },
  correctOrderText: { flex: 1, color: iteraColors.inkBrand, fontSize: 13, lineHeight: 18 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  pressed: { opacity: 0.72 },
})
