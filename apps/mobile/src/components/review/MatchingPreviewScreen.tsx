import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  gradeMatching,
  iteraColors,
  iteraRadii,
  matchingBehavior,
  type ID,
  type MatchingColumn,
  type MatchingGrade,
  type MatchingResponse,
  type Rating,
} from '@itera/core'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'

import { PreviewRatingControls } from '@/src/components/review/PreviewRatingControls'
import { ReviewPreviewHeader } from '@/src/components/review/ReviewPreviewHeader'
import type { MobileMatchingPreviewViewModel } from '@/src/types/review'

const BOARD_GAP = 76
const WIDE_COLUMN_WIDTH = 148
const COLUMN_LABEL_HEIGHT = 34
const CELL_HEIGHT = 92
const CELL_GAP = 22
const FIRST_CELL_CENTER = COLUMN_LABEL_HEIGHT + CELL_GAP + CELL_HEIGHT / 2
const CELL_STEP = CELL_HEIGHT + CELL_GAP

function MatchingBadge({ results = false }: { results?: boolean }) {
  return (
    <View style={[styles.badge, results && styles.badgeResults]}>
      <MaterialCommunityIcons
        color={results ? iteraColors.accent : iteraColors.inkBrand}
        name={results ? 'check-decagram-outline' : 'link-variant'}
        size={21}
      />
      <Text style={[styles.badgeText, results && styles.badgeTextResults]}>
        {results ? 'Results' : 'Matching'}
      </Text>
    </View>
  )
}

function itemText(column: MatchingColumn, id: ID): string {
  return column.items.find((item) => item.id === id)?.content.value ?? ''
}

function columnItems(
  column: MatchingColumn,
  presentedItemIds: Record<ID, ID[]>,
) {
  const byId = new Map(column.items.map((item) => [item.id, item]))
  return (presentedItemIds[column.id] ?? column.items.map((item) => item.id))
    .map((id) => byId.get(id))
    .filter((item): item is MatchingColumn['items'][number] => Boolean(item))
}

function SourceCell({
  id,
  label,
  selected,
  complete,
  correct,
  locked,
  onPress,
}: {
  id: ID
  label: string
  selected: boolean
  complete: boolean
  correct: boolean | null
  locked: boolean
  onPress: (id: ID) => void
}) {
  return (
    <Pressable
      accessibilityHint={locked ? 'Shows this container’s submitted matches' : 'Selects this container for matching'}
      accessibilityLabel={`${label}${complete ? ', complete' : ', not complete'}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onPress(id)}
      style={({ pressed }) => [
        styles.cell,
        styles.sourceCell,
        selected && styles.cellSelected,
        correct === true && styles.cellCorrect,
        correct === false && styles.cellIncorrect,
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={2} style={styles.sourceCode}>{label}</Text>
      <View style={styles.cellStatus}>
        {correct !== null ? (
          <>
            <MaterialCommunityIcons
              color={correct ? iteraColors.success : iteraColors.error}
              name={correct ? 'check-circle' : 'close-circle'}
              size={15}
            />
            <Text style={[styles.cellStatusText, correct ? styles.correctText : styles.incorrectText]}>
              {correct ? 'Correct' : 'Review'}
            </Text>
          </>
        ) : complete ? (
          <>
            <MaterialCommunityIcons color={iteraColors.success} name="check-circle-outline" size={15} />
            <Text style={[styles.cellStatusText, styles.correctText]}>Matched</Text>
          </>
        ) : selected ? (
          <Text style={styles.selectedText}>Selected</Text>
        ) : (
          <Text style={styles.cellStatusText}>Tap to match</Text>
        )}
      </View>
    </Pressable>
  )
}

function OptionCell({
  label,
  selected,
  used,
  correctChoice,
  selectedWrong,
  disabled,
  onPress,
}: {
  label: string
  selected: boolean
  used: boolean
  correctChoice: boolean
  selectedWrong: boolean
  disabled: boolean
  onPress: () => void
}) {
  const showingResult = correctChoice || selectedWrong
  return (
    <Pressable
      accessibilityLabel={`${label}${selected ? ', selected' : ''}${used && !selected ? ', matched to another container' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        selected && styles.cellSelected,
        used && !selected && styles.cellUsed,
        correctChoice && styles.cellCorrect,
        selectedWrong && styles.cellIncorrect,
        disabled && !showingResult && styles.cellDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={3} style={[styles.optionText, disabled && !showingResult && styles.disabledText]}>
        {label}
      </Text>
      {showingResult ? (
        <View style={styles.resultMark}>
          <MaterialCommunityIcons
            color={correctChoice ? iteraColors.success : iteraColors.error}
            name={correctChoice ? 'check-circle' : 'close-circle'}
            size={16}
          />
          <Text style={[styles.resultMarkText, correctChoice ? styles.correctText : styles.incorrectText]}>
            {correctChoice ? 'Correct' : 'Your choice'}
          </Text>
        </View>
      ) : selected ? (
        <MaterialCommunityIcons color={iteraColors.accent} name="check-circle" size={17} />
      ) : null}
    </Pressable>
  )
}

function ConnectionPath({
  fromX,
  fromY,
  toX,
  toY,
  correct,
}: {
  fromX: number
  fromY: number
  toX: number
  toY: number
  correct: boolean | null
}) {
  const lineColor = correct === false
    ? '#e1a29e'
    : correct === true
      ? '#86c99b'
      : iteraColors.borderStrong
  const markerColor = correct === false
    ? iteraColors.error
    : correct === true
      ? iteraColors.success
      : iteraColors.navy
  const controlPull = (toX - fromX) * 0.48
  const markerX = (fromX + toX) / 2
  const markerY = (fromY + toY) / 2
  const curve = `M ${fromX} ${fromY} C ${fromX + controlPull} ${fromY}, ${toX - controlPull} ${toY}, ${toX} ${toY}`
  const markerGlyph = correct === false
    ? `M ${markerX - 4.5} ${markerY - 4.5} L ${markerX + 4.5} ${markerY + 4.5} M ${markerX + 4.5} ${markerY - 4.5} L ${markerX - 4.5} ${markerY + 4.5}`
    : `M ${markerX - 5} ${markerY} L ${markerX - 1.5} ${markerY + 3.5} L ${markerX + 5.5} ${markerY - 4.5}`
  return (
    <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
      <Path d={curve} fill="none" stroke={lineColor} strokeLinecap="round" strokeWidth={2.2} />
      <Circle cx={markerX} cy={markerY} fill={markerColor} r={12} />
      <Path
        d={markerGlyph}
        fill="none"
        stroke={iteraColors.surface}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  )
}

function ConnectionLayer({
  columns,
  columnWidth,
  presentedItemIds,
  response,
  grade,
}: {
  columns: MatchingColumn[]
  columnWidth: number
  presentedItemIds: Record<ID, ID[]>
  response: MatchingResponse
  grade: MatchingGrade | null
}) {
  const [sourceColumn] = columns
  const presented = new Map(columns.map((column) => [
    column.id,
    columnItems(column, presentedItemIds).map((item) => item.id),
  ]))
  const paths: React.ReactNode[] = []

  for (const source of sourceColumn.items) {
    let priorColumn = sourceColumn
    let priorItemId = source.id
    for (let columnIndex = 1; columnIndex < columns.length; columnIndex++) {
      const column = columns[columnIndex]
      const chosenItemId = response[source.id]?.[column.id]
      if (chosenItemId == null) {
        priorColumn = column
        priorItemId = ''
        continue
      }
      const priorIndex = presented.get(priorColumn.id)?.indexOf(priorItemId) ?? -1
      const chosenIndex = presented.get(column.id)?.indexOf(chosenItemId) ?? -1
      if (priorIndex >= 0 && chosenIndex >= 0) {
        const fromX = (columnIndex - 1) * (columnWidth + BOARD_GAP) + columnWidth
        const toX = columnIndex * (columnWidth + BOARD_GAP)
        const result = grade?.cells.find(
          (cell) => cell.sourceItemId === source.id && cell.columnId === column.id,
        )
        paths.push(
          <ConnectionPath
            key={`${source.id}:${column.id}`}
            correct={result?.correct ?? null}
            fromX={fromX}
            fromY={FIRST_CELL_CENTER + priorIndex * CELL_STEP}
            toX={toX}
            toY={FIRST_CELL_CENTER + chosenIndex * CELL_STEP}
          />,
        )
      }
      priorColumn = column
      priorItemId = chosenItemId
    }
  }

  return <View pointerEvents="none" style={styles.connectionLayer}>{paths}</View>
}

function MatchBoard({
  viewModel,
  response,
  activeSourceId,
  grade,
  onSourcePress,
  onCellPress,
}: {
  viewModel: MobileMatchingPreviewViewModel
  response: MatchingResponse
  activeSourceId: ID
  grade: MatchingGrade | null
  onSourcePress: (id: ID) => void
  onCellPress: (column: MatchingColumn, itemId: ID) => void
}) {
  const { width } = useWindowDimensions()
  const { interaction, presentedItemIds } = viewModel
  const [sourceColumn, ...valueColumns] = interaction.columns
  const availableWidth = Math.max(220, width - 78)
  const isWideBoard = matchingBehavior.widthFor(interaction) === 'wide'
  const columnWidth = isWideBoard
    ? WIDE_COLUMN_WIDTH
    : (availableWidth - BOARD_GAP) / 2
  const cellResults = grade?.cells.filter((cell) => cell.sourceItemId === activeSourceId) ?? []
  const truth = interaction.relationships.find(
    (relationship) => relationship[sourceColumn.id] === activeSourceId,
  )
  const activeLabel = itemText(sourceColumn, activeSourceId)

  return (
    <View style={styles.boardSection}>
      <View style={styles.activeContext}>
        <View style={styles.activeContextCopy}>
          <Text style={styles.activeContextLabel}>{grade ? 'INSPECTING' : 'MATCHING NOW'}</Text>
          <Text numberOfLines={1} style={styles.activeContextValue}>{activeLabel}</Text>
        </View>
        <Text style={styles.activeContextHint}>
          {isWideBoard ? 'Swipe columns →' : 'Choose its pair'}
        </Text>
      </View>

      <ScrollView
        accessibilityLabel="Matching columns"
        alwaysBounceHorizontal={false}
        contentContainerStyle={[styles.board, { gap: BOARD_GAP }]}
        directionalLockEnabled
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={isWideBoard}
      >
        <ConnectionLayer
          columnWidth={columnWidth}
          columns={interaction.columns}
          grade={grade}
          presentedItemIds={presentedItemIds}
          response={response}
        />
        <View style={[styles.column, { width: columnWidth }]}>
          <Text numberOfLines={2} style={styles.columnLabel}>{sourceColumn.label ?? 'Term'}</Text>
          {columnItems(sourceColumn, presentedItemIds).map((item) => {
            const complete = valueColumns.every((column) => response[item.id]?.[column.id] != null)
            const sourceResults = grade?.cells.filter((cell) => cell.sourceItemId === item.id) ?? []
            const correct = grade
              ? sourceResults.length > 0 && sourceResults.every((cell) => cell.correct)
              : null
            return (
              <SourceCell
                key={item.id}
                complete={complete}
                correct={correct}
                id={item.id}
                label={item.content.value}
                locked={Boolean(grade)}
                onPress={onSourcePress}
                selected={activeSourceId === item.id}
              />
            )
          })}
        </View>

        {valueColumns.map((column) => (
          <View key={column.id} style={[styles.column, { width: columnWidth }]}>
            <Text numberOfLines={2} style={styles.columnLabel}>{column.label ?? 'Match'}</Text>
            {columnItems(column, presentedItemIds).map((item) => {
              const selected = response[activeSourceId]?.[column.id] === item.id
              const used = !column.fixed && Object.entries(response).some(
                ([sourceId, cells]) => sourceId !== activeSourceId && cells[column.id] === item.id,
              )
              const result = cellResults.find((cell) => cell.columnId === column.id)
              const correctChoice = Boolean(grade && truth?.[column.id] === item.id)
              const selectedWrong = Boolean(grade && selected && !result?.correct)
              return (
                <OptionCell
                  key={item.id}
                  correctChoice={correctChoice}
                  disabled={Boolean(grade)}
                  label={item.content.value}
                  onPress={() => onCellPress(column, item.id)}
                  selected={selected}
                  selectedWrong={selectedWrong}
                  used={used}
                />
              )
            })}
          </View>
        ))}
      </ScrollView>

      {isWideBoard && (
        <View style={styles.swipeNote}>
          <MaterialCommunityIcons color={iteraColors.muted} name="gesture-swipe-horizontal" size={18} />
          <Text style={styles.swipeNoteText}>Swipe sideways to view every column</Text>
        </View>
      )}
    </View>
  )
}

export function MatchingPreviewScreen({ viewModel }: { viewModel: MobileMatchingPreviewViewModel }) {
  const router = useRouter()
  const rotation = useRef(new Animated.Value(0)).current
  const [response, setResponse] = useState<MatchingResponse>({})
  const [grade, setGrade] = useState<MatchingGrade | null>(null)
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const sourceColumn = viewModel.interaction.columns[0]
  const valueColumns = viewModel.interaction.columns.slice(1)
  const [activeSourceId, setActiveSourceId] = useState<ID>(sourceColumn.items[0]?.id ?? '')
  const totalCells = viewModel.interaction.relationships.reduce((total, relationship) => (
    total + valueColumns.filter((column) => relationship[column.id] != null).length
  ), 0)
  const completedCells = useMemo(
    () => Object.values(response).reduce((total, cells) => total + Object.keys(cells).length, 0),
    [response],
  )
  const responseReady = matchingBehavior.isResponseReady?.(response, viewModel.interaction) ?? false

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => subscription.remove()
  }, [])

  function assign(column: MatchingColumn, itemId: ID) {
    if (grade || !activeSourceId) return
    const next: MatchingResponse = {}
    for (const [sourceId, cells] of Object.entries(response)) {
      const steals = !column.fixed && sourceId !== activeSourceId && cells[column.id] === itemId
      next[sourceId] = steals
        ? Object.fromEntries(Object.entries(cells).filter(([columnId]) => columnId !== column.id))
        : { ...cells }
    }
    next[activeSourceId] = { ...(next[activeSourceId] ?? {}), [column.id]: itemId }
    setResponse(next)

    const activeComplete = valueColumns.every((valueColumn) => next[activeSourceId]?.[valueColumn.id] != null)
    if (!activeComplete) return
    const activeIndex = sourceColumn.items.findIndex((item) => item.id === activeSourceId)
    const candidates = [
      ...sourceColumn.items.slice(activeIndex + 1),
      ...sourceColumn.items.slice(0, activeIndex),
    ]
    const nextIncomplete = candidates.find((source) => (
      valueColumns.some((valueColumn) => next[source.id]?.[valueColumn.id] == null)
    ))
    if (nextIncomplete) setActiveSourceId(nextIncomplete.id)
  }

  function submit() {
    if (!responseReady || grade) return
    const nextGrade = gradeMatching(viewModel.interaction, response)
    const firstIncorrect = nextGrade.cells.find((cell) => !cell.correct)?.sourceItemId
    if (firstIncorrect) setActiveSourceId(firstIncorrect)
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
        exitLabel="Exit Matching preview"
        hint={grade ? 'Inspect results' : 'Swipe to view more'}
        hintIcon={grade ? 'check-decagram-outline' : 'gesture-swipe-horizontal'}
        onExit={() => router.replace('/today')}
        total={viewModel.total}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ perspective: 900 }, { rotateY: rotation.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] }) }] },
          ]}
        >
          <MatchingBadge results={Boolean(grade)} />
          <Text style={styles.prompt}>{viewModel.prompt}</Text>
          {!grade && (
            <Text style={styles.instruction}>
              Select a container, then choose one value in each column.
            </Text>
          )}

          <View style={styles.completionRow}>
            <Text style={styles.completionText}>
              {grade ? 'Submitted matches' : `${completedCells} of ${totalCells} matches`}
            </Text>
            <View style={styles.completionTrack}>
              <View
                style={[
                  styles.completionFill,
                  { width: `${totalCells === 0 ? 0 : (completedCells / totalCells) * 100}%` },
                ]}
              />
            </View>
          </View>

          <MatchBoard
            activeSourceId={activeSourceId}
            grade={grade}
            onCellPress={assign}
            onSourcePress={setActiveSourceId}
            response={response}
            viewModel={viewModel}
          />

          {!grade ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !responseReady }}
              disabled={!responseReady}
              onPress={submit}
              style={({ pressed }) => [styles.submit, !responseReady && styles.submitDisabled, pressed && styles.pressed]}
            >
              <Text style={styles.submitText}>Submit answer</Text>
            </Pressable>
          ) : (
            <View style={[styles.summary, grade.correct ? styles.summaryCorrect : styles.summaryIncorrect]}>
              <MaterialCommunityIcons
                color={grade.correct ? iteraColors.success : iteraColors.error}
                name={grade.correct ? 'check-circle-outline' : 'alert-circle-outline'}
                size={20}
              />
              <Text style={[styles.summaryText, grade.correct ? styles.correctText : styles.incorrectText]}>
                {grade.correct ? 'Every relationship is correct' : `${Math.round(grade.score * 100)}% of relationships correct`}
              </Text>
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
  card: { overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surface, paddingVertical: 20, alignItems: 'center', ...Platform.select({ ios: { shadowColor: iteraColors.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 18 }, android: { elevation: 4 }, web: { boxShadow: '0 7px 18px rgba(30,41,59,0.08)' } }) },
  badge: { minHeight: 42, paddingHorizontal: 16, borderRadius: iteraRadii.pill, backgroundColor: iteraColors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeResults: { backgroundColor: iteraColors.accentSofter },
  badgeText: { color: iteraColors.inkBrand, fontSize: 16, fontWeight: '700' },
  badgeTextResults: { color: iteraColors.accentActive },
  prompt: { marginTop: 22, paddingHorizontal: 18, color: iteraColors.inkBrand, fontSize: 23, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  instruction: { marginTop: 8, paddingHorizontal: 20, color: iteraColors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  completionRow: { width: '100%', marginTop: 20, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  completionText: { color: iteraColors.muted, fontSize: 12, fontWeight: '700' },
  completionTrack: { flex: 1, height: 4, overflow: 'hidden', borderRadius: iteraRadii.pill, backgroundColor: iteraColors.border },
  completionFill: { height: '100%', borderRadius: iteraRadii.pill, backgroundColor: iteraColors.accent },
  boardSection: { width: '100%', marginTop: 14 },
  activeContext: { minHeight: 54, marginHorizontal: 18, marginBottom: 12, borderRadius: iteraRadii.control, backgroundColor: iteraColors.navySoft, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  activeContextCopy: { flex: 1 },
  activeContextLabel: { color: iteraColors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  activeContextValue: { marginTop: 2, color: iteraColors.inkBrand, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 14, fontWeight: '700' },
  activeContextHint: { color: iteraColors.muted, fontSize: 11, fontWeight: '600' },
  board: { position: 'relative', paddingHorizontal: 18, paddingBottom: 8, alignItems: 'flex-start' },
  column: { zIndex: 3, gap: CELL_GAP },
  columnLabel: { minHeight: COLUMN_LABEL_HEIGHT, color: iteraColors.muted, fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.35, textTransform: 'uppercase' },
  cell: { height: CELL_HEIGHT, borderRadius: iteraRadii.card, borderWidth: 1, borderColor: iteraColors.border, backgroundColor: iteraColors.surfaceSubtle, paddingHorizontal: 11, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 7 },
  sourceCell: { backgroundColor: iteraColors.surface },
  cellSelected: { borderWidth: 1.5, borderColor: iteraColors.accent, backgroundColor: iteraColors.accentSofter },
  cellUsed: { backgroundColor: iteraColors.selectionSoft },
  cellDisabled: { opacity: 0.62 },
  cellCorrect: { borderColor: '#86c99b', backgroundColor: iteraColors.successSoft },
  cellIncorrect: { borderColor: '#e1a29e', backgroundColor: iteraColors.errorSoft },
  sourceCode: { color: iteraColors.accent, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 14, fontWeight: '700', textAlign: 'center' },
  optionText: { color: iteraColors.inkBrand, fontSize: 14, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  disabledText: { color: iteraColors.muted },
  cellStatus: { minHeight: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  cellStatusText: { color: iteraColors.muted, fontSize: 9, fontWeight: '700' },
  selectedText: { color: iteraColors.accentActive, fontSize: 9, fontWeight: '800' },
  resultMark: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultMarkText: { fontSize: 9, fontWeight: '800' },
  connectionLayer: { position: 'absolute', zIndex: 2, left: 18, right: 18, top: 0, bottom: 8 },
  correctText: { color: iteraColors.success },
  incorrectText: { color: iteraColors.error },
  swipeNote: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  swipeNoteText: { color: iteraColors.muted, fontSize: 11, fontWeight: '600' },
  submit: { alignSelf: 'stretch', minHeight: 54, marginTop: 20, marginHorizontal: 18, borderRadius: iteraRadii.control, backgroundColor: iteraColors.accent, alignItems: 'center', justifyContent: 'center' },
  submitDisabled: { opacity: 0.38 },
  submitText: { color: iteraColors.surface, fontSize: 17, fontWeight: '700' },
  summary: { alignSelf: 'stretch', minHeight: 48, marginTop: 18, marginHorizontal: 18, borderRadius: iteraRadii.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  summaryCorrect: { backgroundColor: iteraColors.successSoft },
  summaryIncorrect: { backgroundColor: iteraColors.errorSoft },
  summaryText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
})
