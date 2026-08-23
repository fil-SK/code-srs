import { useMemo } from 'react'
import { Info } from 'lucide-react'
import {
  HEATMAP_RANGE_OPTIONS,
  type HeatmapDay,
  type HeatmapRangeValue,
} from '@/domain/stats/progressMetrics'
import { SegmentedToggle } from './SegmentedToggle'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' })

const LEVEL_BG: Record<HeatmapDay['level'], string> = {
  0: 'var(--itera-surface-subtle)',
  1: 'var(--itera-accent-softer)',
  2: 'var(--itera-accent-soft)',
  3: '#ffb37a', // mid step between accent-soft and the full accent
  4: 'var(--itera-accent)',
}

function toWeeks(days: HeatmapDay[]): (HeatmapDay | null)[][] {
  if (!days.length) return []
  const firstDow = (new Date(days[0].date).getDay() + 6) % 7 // Mon=0..Sun=6
  const weeks: (HeatmapDay | null)[][] = []
  let week: (HeatmapDay | null)[] = new Array(firstDow).fill(null)
  for (const d of days) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

// Month labels above the grid, placed once per week-column where that
// column's first real day starts a new month — skipped if it would land
// within 2 columns of the previous label (e.g. a 30D range starting a couple
// of days into a new month), since two 3-letter labels that close together
// overlap at this cell size.
function monthLabels(weeks: (HeatmapDay | null)[][]): (string | null)[] {
  let lastMonth = -1
  let lastLabelIndex = -Infinity
  return weeks.map((week, i) => {
    const first = week.find((d): d is HeatmapDay => d !== null)
    if (!first) return null
    const month = new Date(first.date).getMonth()
    if (month === lastMonth || i - lastLabelIndex < 3) return null
    lastMonth = month
    lastLabelIndex = i
    return MONTH.format(new Date(first.date))
  })
}

export function ActivityHeatmap({
  days,
  rangeValue,
  onRangeChange,
}: {
  days: HeatmapDay[]
  rangeValue: HeatmapRangeValue
  onRangeChange: (value: HeatmapRangeValue) => void
}) {
  const weeks = useMemo(() => toWeeks(days), [days])
  const months = useMemo(() => monthLabels(weeks), [weeks])
  const cell = 12
  const gap = 3

  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-itera-ink-brand">Activity heat map</h3>
            <Info size={14} strokeWidth={1.9} className="text-itera-muted" aria-hidden="true" />
          </div>
          <p className="text-xs text-itera-muted">Daily cards reviewed</p>
        </div>
        <SegmentedToggle
          options={HEATMAP_RANGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          value={rangeValue}
          onChange={onRangeChange}
        />
      </div>

      {days.length === 0 ? (
        <p className="mt-6 text-sm text-itera-muted">No review activity yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="inline-flex gap-2">
            <div
              className="grid flex-none text-[10px] text-itera-muted"
              style={{ gridTemplateRows: `14px repeat(7, ${cell}px)`, rowGap: gap }}
            >
              <span />
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="flex items-center">
                  {label}
                </span>
              ))}
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, ${cell}px)`,
                gridTemplateRows: `14px repeat(7, ${cell}px)`,
                gap,
              }}
            >
              {months.map((label, i) => (
                <span
                  key={`month-${i}`}
                  className="text-[10px] text-itera-muted"
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                >
                  {label}
                </span>
              ))}
              {weeks.map((week, wi) =>
                week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    title={day ? `${new Date(day.date).toDateString()}: ${day.count} review${day.count === 1 ? '' : 's'}` : undefined}
                    className="rounded-[3px]"
                    style={{
                      gridColumn: wi + 1,
                      gridRow: di + 2,
                      width: cell,
                      height: cell,
                      background: day ? LEVEL_BG[day.level] : 'transparent',
                    }}
                  />
                )),
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-itera-muted">
            Less
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span
                key={level}
                className="rounded-[3px]"
                style={{ width: cell, height: cell, background: LEVEL_BG[level] }}
              />
            ))}
            More
          </div>
        </div>
      )}
    </div>
  )
}
