import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import {
  DATE_RANGE_PRESETS,
  heatmapMonthLabels,
  iteraColors,
  iteraRadii,
  toHeatmapWeeks,
  type DateRangePreset,
} from '@itera/core'
import { useRouter } from 'expo-router'
import type { ComponentProps } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MobileHeader } from '@/src/components/today/MobileHeader'
import type {
  MobileProgressMetricViewModel,
  MobileProgressViewModel,
} from '@/src/types/progress'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

const metricPresentation: Record<MobileProgressMetricViewModel['id'], { icon: IconName; color: string; soft: string }> = {
  learned: { icon: 'school-outline', color: '#7c5ce7', soft: '#f1edff' },
  due: { icon: 'calendar-clock-outline', color: iteraColors.accent, soft: iteraColors.accentSoft },
  reviews: { icon: 'file-document-outline', color: '#2876e8', soft: '#eaf2ff' },
  retention: { icon: 'sync', color: '#17a05d', soft: '#e9f9f0' },
  streak: { icon: 'fire', color: iteraColors.accent, soft: iteraColors.accentSoft },
}

const heatColors = ['#fff5ed', '#ffd9bf', '#ffb27c', '#ff8740', iteraColors.accent]

function MetricCard({ metric }: { metric: MobileProgressMetricViewModel }) {
  const presentation = metricPresentation[metric.id]
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: presentation.soft }]}>
        <MaterialCommunityIcons color={presentation.color} name={presentation.icon} size={22} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{metric.label}</Text>
        <Text style={styles.metricValue}>{metric.value}</Text>
        <Text style={styles.metricSupporting}>{metric.supportingText}</Text>
      </View>
    </View>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Room for "Mon" at 10pt beside the grid.
const WEEKDAY_GUTTER = 30
const MONTH_ROW_HEIGHT = 15

// The grid is a calendar, so its shape has to say so: one column per week, one
// row per weekday, months named above the column they start in. It used to be a
// wrapping run of 24px squares, which put an arbitrary number of days in each
// row - a row was neither a week nor a month, and no cell said which day it was.
function Activity({ days }: { days: MobileProgressViewModel['activityDays'] }) {
  const [width, setWidth] = useState(0)
  const grid = useRef<ScrollView>(null)
  const weeks = useMemo(() => toHeatmapWeeks(days), [days])
  const months = useMemo(() => heatmapMonthLabels(weeks), [weeks])
  const reviewed = days.reduce((total, day) => total + day.count, 0)

  // Cells grow to fill a short range and shrink for a long one, down to a floor
  // that stays legible and tappable-adjacent; past that the grid scrolls
  // sideways rather than shrinking further, so a year stays a year.
  const available = Math.max(0, width - WEEKDAY_GUTTER)
  const columns = Math.max(1, weeks.length)
  const gap = Math.floor((available - 4 * (columns - 1)) / columns) >= 14 ? 4 : 3
  const cell = Math.max(10, Math.min(26, Math.floor((available - gap * (columns - 1)) / columns)))
  const gridWidth = columns * cell + (columns - 1) * gap
  const gridHeight = 7 * cell + 6 * gap
  // Three labels are all that fit once a row is shorter than its own text.
  const everyWeekday = cell + gap >= 16

  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Activity</Text>
      <Text style={styles.sectionSubtitle}>
        {reviewed === 0
          ? 'Daily cards reviewed'
          : `Daily cards reviewed - ${reviewed} in this range`}
      </Text>

      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.heatmap}>
        <View style={[styles.weekdayGutter, { height: gridHeight, marginTop: MONTH_ROW_HEIGHT }]}>
          {WEEKDAY_LABELS.map((label, index) =>
            everyWeekday || index % 2 === 0 ? (
              <Text
                key={label}
                style={[styles.weekdayLabel, { top: index * (cell + gap) + cell / 2 - 7 }]}
              >
                {label}
              </Text>
            ) : null,
          )}
        </View>

        {/*
          A year is wider than a phone, so it opens on the end of the range
          rather than the start of it: the visitor's own recent days are the
          point, and scrolled to the far left they are the one thing off screen.
        */}
        <ScrollView
          alwaysBounceHorizontal={false}
          horizontal
          onContentSizeChange={() => grid.current?.scrollToEnd({ animated: false })}
          ref={grid}
          scrollEnabled={gridWidth > available}
          showsHorizontalScrollIndicator={false}
          style={styles.heatmapScroll}
        >
          <View style={{ width: gridWidth }}>
            <View style={{ height: MONTH_ROW_HEIGHT }}>
              {months.map((label, index) =>
                label === null ? null : (
                  <Text
                    key={`${label}-${index}`}
                    style={[styles.monthLabel, { left: index * (cell + gap) }]}
                  >
                    {label}
                  </Text>
                ),
              )}
            </View>

            <View
              accessibilityLabel={`Review activity, ${days.length} days`}
              style={[styles.heatGrid, { gap }]}
            >
              {weeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={{ gap }}>
                  {week.map((day, dayIndex) =>
                    day === null ? (
                      <View key={`blank-${weekIndex}-${dayIndex}`} style={{ width: cell, height: cell }} />
                    ) : (
                      <View
                        key={day.id}
                        accessibilityLabel={`${day.dateLabel}, ${day.count} ${
                          day.count === 1 ? 'review' : 'reviews'
                        }`}
                        style={{
                          width: cell,
                          height: cell,
                          borderRadius: Math.max(3, Math.round(cell / 5)),
                          backgroundColor: heatColors[day.level],
                        }}
                      />
                    ),
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        {heatColors.map((color) => <View key={color} style={[styles.legendCell, { backgroundColor: color }]} />)}
        <Text style={styles.legendText}>More</Text>
      </View>
    </SectionCard>
  )
}

// 7D is deliberately absent: the mobile Progress mockup's group is 30D/3M/1Y,
// and a week-wide window makes a one-column heat map and a period-over-period
// KPI delta against the week before it.
const RANGE_OPTIONS = DATE_RANGE_PRESETS.filter((preset) => preset.value !== '7d')

function RangeControl({
  preset,
  onChange,
}: {
  preset: DateRangePreset
  onChange: (preset: DateRangePreset) => void
}) {
  return (
    <View style={styles.segmented}>
      {RANGE_OPTIONS.map((option) => {
        const selected = option.value === preset
        return (
          <Pressable
            key={option.value}
            accessibilityHint={`Reports the ${option.label.toLocaleLowerCase()}`}
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {option.short}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function RetentionChart({
  percent,
  series,
  labels,
}: {
  percent: number | null
  series: (number | null)[]
  labels: [string, string, string]
}) {
  const [width, setWidth] = useState(0)
  const height = 116
  const padX = 8
  const usableHeight = 72
  const observed = series.filter((value): value is number => value !== null)
  let axisMin = observed.length > 0 ? Math.max(0, Math.floor((Math.min(...observed) - 0.05) * 10) / 10) : 0
  let axisMax = observed.length > 0 ? Math.min(1, Math.ceil((Math.max(...observed) + 0.05) * 10) / 10) : 1
  if (axisMax <= axisMin) {
    axisMin = Math.max(0, axisMin - 0.1)
    axisMax = Math.min(1, axisMax + 0.1)
  }
  const points = width > 0
    ? series.map((value, index) => ({
        x: padX + (index / (series.length - 1)) * (width - padX * 2),
        y: value === null ? null : 14 + ((axisMax - value) / (axisMax - axisMin)) * usableHeight,
        value,
      }))
    : []

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width)
  }

  return (
    <SectionCard>
      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionTitle}>Retention</Text>
          <Text style={styles.sectionSubtitle}>How well your knowledge is sticking</Text>
        </View>
        <View style={styles.percentPill}><Text style={styles.percentPillText}>{percent === null ? '—' : `${percent}%`}</Text></View>
      </View>
      <View
        accessibilityLabel="Retention over time chart"
        onLayout={handleLayout}
        style={[styles.chart, { height }]}
      >
        {[0, 1, 2].map((line) => <View key={line} style={[styles.chartGrid, { top: 18 + line * 32 }]} />)}
        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1]
          if (point.y === null || next.y === null) return null
          const length = Math.hypot(next.x - point.x, next.y - point.y)
          const angle = Math.atan2(next.y - point.y, next.x - point.x)
          return (
            <View
              key={`segment-${index}`}
              style={[
                styles.chartSegment,
                {
                  width: length,
                  left: point.x,
                  top: point.y,
                  transform: [{ rotateZ: `${angle}rad` }],
                },
              ]}
            />
          )
        })}
        {points.map((point, index) => {
          if (point.y === null) return null
          const previousKnown = index > 0 && points[index - 1]?.y !== null
          const nextKnown = index < points.length - 1 && points[index + 1]?.y !== null
          if (previousKnown || nextKnown) return null
          return (
            <View
              key={`point-${index}`}
              accessibilityLabel={`Isolated retention observation, ${Math.round((point.value ?? 0) * 100)} percent`}
              style={[styles.chartPoint, { left: point.x - 4, top: point.y - 4 }]}
            />
          )
        })}
      </View>
      <View style={styles.chartLabels}>
        {labels.map((label, index) => <Text key={`${label}-${index}`} style={styles.chartLabel}>{label}</Text>)}
      </View>
    </SectionCard>
  )
}

function DeckPerformance({
  decks,
  onOpenDeck,
}: {
  decks: MobileProgressViewModel['decks']
  onOpenDeck: (deckId: string) => void
}) {
  return (
    <SectionCard>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>Deck performance</Text>
        <Text style={styles.unavailableLabel}>Overview</Text>
      </View>
      <View style={styles.list}>
        {decks.map((deck, index) => (
          <Pressable
            key={deck.id}
            accessibilityHint="Opens this deck"
            accessibilityRole="button"
            onPress={() => onOpenDeck(deck.id)}
            style={({ pressed }) => [
              styles.deckRow,
              index > 0 && styles.rowBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.deckMark}><Text style={styles.deckMarkText}>{deck.mark}</Text><View style={styles.deckMarkAccent} /></View>
            <View style={styles.deckCopy}>
              <Text numberOfLines={1} style={styles.rowTitle}>{deck.name}</Text>
              <View style={styles.deckMeta}>
                <Text style={deck.retentionKnown ? styles.successText : styles.rowSubtitle}>{deck.retentionLabel}</Text>
                <Text style={styles.metaSeparator}>•</Text>
                <Text style={styles.dueText}>{deck.dueLabel}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  )
}

function Milestones({ milestones }: { milestones: MobileProgressViewModel['milestones'] }) {
  return (
    <SectionCard>
      <Text style={styles.sectionTitle}>Recent milestones</Text>
      <View style={styles.list}>
        {milestones.length === 0 && (
          <Text style={styles.rowSubtitle}>Keep reviewing to reach your first milestone.</Text>
        )}
        {milestones.map((milestone, index) => {
          const streak = milestone.type === 'streak'
          return (
            <View key={milestone.id} style={[styles.milestoneRow, index > 0 && styles.rowBorder]}>
              <View style={[styles.milestoneIcon, { backgroundColor: streak ? iteraColors.accentSoft : iteraColors.successSoft }]}>
                <MaterialCommunityIcons color={streak ? iteraColors.accent : iteraColors.success} name={streak ? 'fire' : 'trophy-outline'} size={21} />
              </View>
              <View style={styles.deckCopy}>
                <Text style={styles.rowTitle}>{milestone.title}</Text>
                <Text style={styles.rowSubtitle}>{milestone.subtitle}</Text>
              </View>
              <Text style={styles.milestoneDate}>{milestone.dateLabel}</Text>
            </View>
          )
        })}
      </View>
    </SectionCard>
  )
}

export function ProgressScreen({
  viewModel,
  rangePreset,
  onRangePresetChange,
}: {
  viewModel: MobileProgressViewModel
  rangePreset: DateRangePreset
  onRangePresetChange: (preset: DateRangePreset) => void
}) {
  const router = useRouter()

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MobileHeader />
        <View style={styles.intro}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>How your learning is holding up.</Text>
        </View>
        {/*
          The range group sits under the dates rather than beside them, which is
          where the mockup puts it: a phone-width row cannot hold three segments
          and "Sep 24, 2025 - Sep 23, 2026" without truncating the dates, and the
          dates are what tell the visitor what the range they picked came out as.
        */}
        <View style={styles.rangeRow}>
          <View accessibilityLabel={`Reporting ${viewModel.rangeLabel}`} style={styles.dateControl}>
            <MaterialCommunityIcons color={iteraColors.muted} name="calendar-blank-outline" size={19} />
            <Text numberOfLines={1} style={styles.dateText}>{viewModel.rangeLabel}</Text>
          </View>
          <RangeControl onChange={onRangePresetChange} preset={rangePreset} />
        </View>
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>{viewModel.metricsHeading}</Text>
          <View style={styles.metricGrid}>{viewModel.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</View>
        </View>
        <Activity days={viewModel.activityDays} />
        <RetentionChart
          labels={viewModel.retentionLabels}
          percent={viewModel.retentionPercent}
          series={viewModel.retentionSeries}
        />
        <DeckPerformance
          decks={viewModel.decks}
          onOpenDeck={(deckId) =>
            router.push({ pathname: '/deck/[deckId]', params: { deckId } })
          }
        />
        <Milestones milestones={viewModel.milestones} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: iteraColors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 142, gap: 16 },
  intro: { gap: 4, marginTop: 10 },
  title: { color: iteraColors.inkBrand, fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: iteraColors.muted, fontSize: 16, lineHeight: 23 },
  rangeRow: { gap: 10 },
  dateControl: { flex: 1, minHeight: 48, paddingHorizontal: 12, borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.borderStrong, backgroundColor: iteraColors.surface, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { flex: 1, color: iteraColors.inkBrand, fontSize: 14, fontWeight: '600' },
  metricsSection: { borderRadius: iteraRadii.card, backgroundColor: iteraColors.surface, borderWidth: 1, borderColor: iteraColors.border, padding: 16, gap: 13, shadowColor: iteraColors.ink, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', minHeight: 104, flexGrow: 1, borderRadius: iteraRadii.control, backgroundColor: iteraColors.surfaceSubtle, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metricIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  metricCopy: { flex: 1, minWidth: 0 },
  metricLabel: { color: iteraColors.muted, fontSize: 13, lineHeight: 17, fontWeight: '600', flexShrink: 1 },
  metricValue: { color: iteraColors.inkBrand, fontSize: 25, lineHeight: 31, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
  metricSupporting: { color: iteraColors.muted, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  sectionCard: { borderRadius: iteraRadii.card, backgroundColor: iteraColors.surface, borderWidth: 1, borderColor: iteraColors.border, padding: 16, shadowColor: iteraColors.ink, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  sectionTitle: { color: iteraColors.inkBrand, fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
  sectionSubtitle: { color: iteraColors.muted, fontSize: 13, marginTop: 3 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  segmented: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: iteraRadii.control, borderWidth: 1, borderColor: iteraColors.borderStrong, backgroundColor: iteraColors.surfaceSubtle },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: iteraRadii.control - 4, borderWidth: 1, borderColor: 'transparent' },
  segmentSelected: { borderColor: iteraColors.accent, backgroundColor: iteraColors.surface },
  segmentText: { color: iteraColors.muted, fontSize: 14, fontWeight: '600' },
  segmentTextSelected: { color: iteraColors.accent, fontWeight: '700' },
  // A range narrow enough to fit is centred rather than left in a half-empty
  // card; one too wide to fit takes the whole width and scrolls inside it.
  heatmap: { marginTop: 16, flexDirection: 'row', justifyContent: 'center' },
  heatmapScroll: { flexGrow: 0, flexShrink: 1 },
  heatGrid: { flexDirection: 'row' },
  weekdayGutter: { width: WEEKDAY_GUTTER, position: 'relative' },
  weekdayLabel: { position: 'absolute', left: 0, height: 14, color: iteraColors.muted, fontSize: 10, lineHeight: 14 },
  monthLabel: { position: 'absolute', top: 0, color: iteraColors.muted, fontSize: 10, lineHeight: 13 },
  legend: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendCell: { width: 13, height: 13, borderRadius: 3 },
  legendText: { color: iteraColors.muted, fontSize: 11 },
  percentPill: { borderRadius: iteraRadii.pill, backgroundColor: iteraColors.accent, paddingHorizontal: 10, paddingVertical: 5 },
  percentPillText: { color: iteraColors.surface, fontSize: 13, fontWeight: '700' },
  chart: { marginTop: 12, position: 'relative', overflow: 'hidden' },
  chartGrid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: iteraColors.border },
  chartSegment: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: iteraColors.accent, transformOrigin: 'left center' },
  chartPoint: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: iteraColors.accent },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { color: iteraColors.muted, fontSize: 11 },
  unavailableLabel: { color: iteraColors.muted, fontSize: 12, fontWeight: '600' },
  list: { marginTop: 9 },
  deckRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: iteraColors.border },
  deckMark: { width: 45, height: 45, overflow: 'hidden', borderRadius: 10, backgroundColor: iteraColors.navy, alignItems: 'center', justifyContent: 'center' },
  deckMarkText: { color: iteraColors.surface, fontSize: 15, fontWeight: '700' },
  deckMarkAccent: { position: 'absolute', right: -5, bottom: -9, width: 28, height: 15, backgroundColor: iteraColors.accent, transform: [{ rotateZ: '-35deg' }] },
  deckCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: iteraColors.inkBrand, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  rowSubtitle: { color: iteraColors.muted, fontSize: 13, lineHeight: 18 },
  deckMeta: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaSeparator: { color: iteraColors.mutedLight, fontSize: 12 },
  successText: { color: iteraColors.success, fontSize: 13, fontWeight: '600' },
  dueText: { color: iteraColors.accent, fontSize: 13, fontWeight: '600' },
  milestoneRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  milestoneIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pressed: {
    opacity: 0.65,
  },
  milestoneDate: { color: iteraColors.muted, fontSize: 12 },
})
