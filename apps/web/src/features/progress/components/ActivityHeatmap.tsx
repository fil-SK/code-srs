import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { heatmapMonthLabels, toHeatmapWeeks } from '@fliptap/core'
import {
  HEATMAP_RANGE_OPTIONS,
  type HeatmapDay,
  type HeatmapRangeValue,
} from '@/domain/stats/progressMetrics'
import { SegmentedToggle } from './SegmentedToggle'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

const VIEWPORT_MARGIN = 8

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

  // The hovered day, and the cell's box on screen. A visible label replaces the
  // native `title`, which appears late and never on touch.
  const [hover, setHover] = useState<{ day: HeatmapDay; cellBox: DOMRect } | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Placed after render, once the label's real size is known. It is fixed to the
  // viewport rather than positioned inside the grid, because the grid sits in an
  // overflow-x scroll container that clips anything near its edge. Above the cell
  // by default; below it when there is no room above, which is the top week row.
  // Clamped horizontally so a label at either end of the grid stays on screen.
  useLayoutEffect(() => {
    if (!hover || !tooltipRef.current) {
      setPosition(null)
      return
    }
    const { width, height } = tooltipRef.current.getBoundingClientRect()
    const { left, top, bottom, width: cellWidth } = hover.cellBox
    const centre = left + cellWidth / 2
    const clampedLeft = Math.min(
      Math.max(centre - width / 2, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN,
    )
    const above = top - height - 6 >= VIEWPORT_MARGIN
    setPosition({ left: clampedLeft, top: above ? top - height - 6 : bottom + 6 })
  }, [hover])

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
              className="grid"
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
                        ? (e) => setHover({ day, cellBox: e.currentTarget.getBoundingClientRect() })
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
            </div>
          </div>

          {hover && (
            <div
              ref={tooltipRef}
              role="tooltip"
              className="pointer-events-none fixed z-10 whitespace-nowrap rounded-md bg-fliptap-ink-brand px-2 py-1 text-[11px] text-white shadow-md"
              style={{
                left: position?.left ?? 0,
                top: position?.top ?? 0,
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              <span className="font-semibold">{heatmapCellLabel(hover.day)}</span>
            </div>
          )}

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
