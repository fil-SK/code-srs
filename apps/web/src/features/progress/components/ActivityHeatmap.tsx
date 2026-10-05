import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { heatmapMonthLabels, toHeatmapWeeks } from '@fliptap/core'
import {
  HEATMAP_RANGE_OPTIONS,
  type HeatmapDay,
  type HeatmapRangeValue,
} from '@/domain/stats/progressMetrics'
import { SegmentedToggle } from './SegmentedToggle'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type TooltipAlign = 'start' | 'center' | 'end'
type TooltipPlacement = 'above' | 'below'

const TOOLTIP_SHIFT: Record<TooltipAlign, string> = {
  start: '0',
  center: '-50%',
  end: '-100%',
}

// "Tue, Oct 5, 2026: 12 cards reviewed". Used for both the visible tooltip and
// the cell's accessible name, so sighted and screen-reader users get the same answer.
function heatmapCellLabel(day: HeatmapDay): string {
  const date = new Date(day.date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  if (day.count === 0) return `${date}: no cards reviewed`
  return `${date}: ${day.count} card${day.count === 1 ? '' : 's'} reviewed`
}

const LEVEL_BG: Record<HeatmapDay['level'], string> = {
  0: 'var(--fliptap-surface-subtle)',
  1: 'var(--fliptap-accent-softer)',
  2: 'var(--fliptap-accent-soft)',
  3: '#ffb37a', // mid step between accent-soft and the full accent
  4: 'var(--fliptap-accent)',
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
  // The hovered cell's day and its position inside the grid. A visible label
  // replaces the native `title`, which appears late and never on touch.
  const [hover, setHover] = useState<{
    day: HeatmapDay
    left: number
    top: number
    align: TooltipAlign
    placement: TooltipPlacement
  } | null>(null)

  return (
    <div className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 shadow-[var(--fliptap-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-fliptap-ink-brand">Activity heat map</h3>
            <Info size={14} strokeWidth={1.9} className="text-fliptap-muted" aria-hidden="true" />
          </div>
          <p className="text-xs text-fliptap-muted">Daily cards reviewed</p>
        </div>
        <SegmentedToggle
          options={HEATMAP_RANGE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          value={rangeValue}
          onChange={onRangeChange}
        />
      </div>

      {days.length === 0 ? (
        <p className="mt-6 text-sm text-fliptap-muted">No review activity yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <div className="inline-flex gap-2">
            <div
              className="grid flex-none text-[10px] text-fliptap-muted"
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
              className="relative grid"
              onPointerLeave={() => setHover(null)}
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, ${cell}px)`,
                gridTemplateRows: `14px repeat(7, ${cell}px)`,
                gap,
              }}
            >
              {months.map((label, i) => (
                <span
                  key={`month-${i}`}
                  className="text-[10px] text-fliptap-muted"
                  style={{ gridColumn: i + 1, gridRow: 1 }}
                >
                  {label}
                </span>
              ))}
              {weeks.map((week, wi) =>
                week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    role={day ? 'img' : undefined}
                    aria-label={day ? heatmapCellLabel(day) : undefined}
                    onPointerEnter={
                      day
                        ? (e) => {
                            // Centre the label over the cell, but pin it to the grid's
                            // start or end near the edges: the scroll container would
                            // otherwise clip it. The half-width is a rough label size.
                            const left = e.currentTarget.offsetLeft
                            const gridWidth = e.currentTarget.offsetParent?.clientWidth ?? 0
                            const edge = 90
                            const align: TooltipAlign =
                              left < edge ? 'start' : left > gridWidth - edge ? 'end' : 'center'
                            // The top week row sits under the month labels, and above it the
                            // scroll container clips, so its label opens downward instead.
                            const top = e.currentTarget.offsetTop
                            const placement: TooltipPlacement = top < 30 ? 'below' : 'above'
                            setHover({ day, left, top, align, placement })
                          }
                        : undefined
                    }
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

              {hover && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-fliptap-ink-brand px-2 py-1 text-[11px] text-white shadow-md"
                  style={{
                    left: hover.align === 'start' ? hover.left : hover.align === 'end' ? hover.left + cell : hover.left + cell / 2,
                    top: hover.placement === 'above' ? hover.top - 6 : hover.top + cell + 6,
                    transform: `translate(${TOOLTIP_SHIFT[hover.align]}, ${hover.placement === 'above' ? '-100%' : '0'})`,
                  }}
                >
                  <span className="font-semibold">{heatmapCellLabel(hover.day)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-fliptap-muted">
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
