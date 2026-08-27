import { useMemo } from 'react'
import { Info } from 'lucide-react'
import { heatmapMonthLabels, toHeatmapWeeks } from '@itera/core'
import {
  HEATMAP_RANGE_OPTIONS,
  type HeatmapDay,
  type HeatmapRangeValue,
} from '@/domain/stats/progressMetrics'
import { SegmentedToggle } from './SegmentedToggle'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const LEVEL_BG: Record<HeatmapDay['level'], string> = {
  0: 'var(--itera-surface-subtle)',
  1: 'var(--itera-accent-softer)',
  2: 'var(--itera-accent-soft)',
  3: '#ffb37a', // mid step between accent-soft and the full accent
  4: 'var(--itera-accent)',
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
  const weeks = useMemo(() => toHeatmapWeeks(days), [days])
  const months = useMemo(() => heatmapMonthLabels(weeks), [weeks])
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
