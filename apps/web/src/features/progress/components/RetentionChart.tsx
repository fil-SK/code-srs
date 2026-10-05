import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import type { RetentionPoint } from '@/domain/stats/progressMetrics'
import { DeckScopeDropdown, type DropdownOption } from './DeckScopeDropdown'
import {
  buildRetentionGeometry,
  CHART_HEIGHT as HEIGHT,
  CHART_WIDTH as WIDTH,
  PAD_X,
  xFor,
  yFor,
} from './retentionChartPath'

const DATE_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const FULL_DATE_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// A bucket spans one day on short ranges and several on long ones, so the
// tooltip names the whole span rather than implying a single day.
function bucketLabel(point: RetentionPoint): string {
  const start = new Date(point.bucketStart)
  const end = new Date(point.bucketEnd - 1)
  if (start.toDateString() === end.toDateString()) return FULL_DATE_LABEL.format(start)
  return `${DATE_LABEL.format(start)} – ${FULL_DATE_LABEL.format(end)}`
}

export function RetentionChart({
  points,
  deckOptions,
  selectedDeckId,
  onDeckChange,
}: {
  points: RetentionPoint[]
  deckOptions: DropdownOption[]
  selectedDeckId: string
  onDeckChange: (deckId: string) => void
}) {
  const known = points.filter((p) => p.retention !== null) as (RetentionPoint & { retention: number })[]

  const geometry = useMemo(() => buildRetentionGeometry(points), [points])

  const average = known.length
    ? known.reduce((sum, p) => sum + p.retention, 0) / known.length
    : null

  const last = known[known.length - 1]
  const lastX = last ? xFor(points.indexOf(last), points.length) : 0
  const lastY = last ? yFor(last.retention) : 0

  // The bucket under the pointer. Each bucket owns a column of the plot, so the
  // hit target is that column's full height, which also catches gaps.
  const [hovered, setHovered] = useState<number | null>(null)
  const columnWidth = points.length > 1 ? (WIDTH - 2 * PAD_X) / (points.length - 1) : WIDTH - 2 * PAD_X
  const hoveredPoint = hovered !== null ? points[hovered] : null
  const hoveredX = hovered !== null ? xFor(hovered, points.length) : 0
  const hoveredY = hoveredPoint?.retention != null ? yFor(hoveredPoint.retention) : HEIGHT / 2

  // A handful of evenly-spaced x-axis date labels rather than one per bucket.
  const labelCount = Math.min(5, points.length)
  const labelIndices =
    labelCount <= 1
      ? [0]
      : Array.from({ length: labelCount }, (_, i) => Math.round((i / (labelCount - 1)) * (points.length - 1)))

  return (
    <div className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 shadow-[var(--fliptap-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-fliptap-ink-brand">Retention over time</h3>
            <Info size={14} strokeWidth={1.9} className="text-fliptap-muted" aria-hidden="true" />
          </div>
          <p className="text-xs text-fliptap-muted">Your ability to recall cards</p>
        </div>
        <DeckScopeDropdown
          options={[{ value: 'all', label: 'All decks' }, ...deckOptions]}
          value={selectedDeckId}
          onChange={onDeckChange}
        />
      </div>

      {known.length < 2 ? (
        <p className="mt-8 text-sm text-fliptap-muted">Not enough review history yet to chart a trend.</p>
      ) : (
        <div className="relative mt-4">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            role="img"
            aria-label="Retention rate over time"
            onPointerLeave={() => setHovered(null)}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <line
                key={v}
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="var(--fliptap-border)"
                strokeWidth="1"
              />
            ))}

            {average !== null && (
              <line
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={yFor(average)}
                y2={yFor(average)}
                stroke="var(--fliptap-border-strong)"
                strokeWidth="1.5"
                strokeDasharray="3 4"
              />
            )}

            {geometry.segments.map((linePath) => (
              <path
                key={linePath}
                data-retention-segment="true"
                d={linePath}
                fill="none"
                stroke="var(--fliptap-accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* A bucket with no observed neighbour has no line to belong to, so
                it is drawn as a point. The final observation is not excluded
                here: when it is itself isolated, its own emphasized marker
                below simply covers this identical dot. */}
            {geometry.isolated.map((marker) => (
              <circle
                key={marker.index}
                data-retention-point="true"
                cx={marker.x}
                cy={marker.y}
                r="4"
                fill="var(--fliptap-accent)"
              />
            ))}

            {last && (
              <>
                <circle cx={lastX} cy={lastY} r="4.5" fill="var(--fliptap-accent)" />
                <circle cx={lastX} cy={lastY} r="4.5" fill="none" stroke="var(--fliptap-surface)" strokeWidth="2" />
              </>
            )}

            {labelIndices.map((i) => (
              <text
                key={i}
                x={xFor(i, points.length)}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                className="fill-fliptap-muted text-[10px]"
              >
                {DATE_LABEL.format(new Date(points[i].bucketStart))}
              </text>
            ))}

            {hoveredPoint?.retention != null && (
              <circle cx={hoveredX} cy={hoveredY} r="5.5" fill="var(--fliptap-accent)" stroke="var(--fliptap-surface)" strokeWidth="2" />
            )}

            {points.map((p, i) => (
              <rect
                key={`hit-${p.bucketStart}`}
                x={xFor(i, points.length) - columnWidth / 2}
                y={0}
                width={columnWidth}
                height={HEIGHT}
                fill="transparent"
                onPointerEnter={() => setHovered(i)}
              />
            ))}
          </svg>

          {hoveredPoint && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-fliptap-ink-brand px-2.5 py-1.5 text-[11px] text-white shadow-md"
              style={{
                left: `${(hoveredX / WIDTH) * 100}%`,
                top: `${(hoveredY / HEIGHT) * 100}%`,
                transform: `translate(${hoveredX / WIDTH < 0.15 ? '0' : hoveredX / WIDTH > 0.85 ? '-100%' : '-50%'}, -140%)`,
              }}
            >
              <div className="font-semibold">{bucketLabel(hoveredPoint)}</div>
              <div>
                {hoveredPoint.retention === null
                  ? 'No reviews in this period'
                  : `${Math.round(hoveredPoint.retention * 100)}% retention`}
              </div>
            </div>
          )}

          {/* Hidden while a bucket is hovered: the tooltip states that value, and the
              two would otherwise sit on top of each other on the latest point. */}
          {last && hovered === null && (
            <span
              className="absolute rounded-fliptap-pill bg-fliptap-accent px-2 py-0.5 text-xs font-semibold text-white"
              style={{
                left: `${(lastX / WIDTH) * 100}%`,
                top: `${(lastY / HEIGHT) * 100}%`,
                transform: 'translate(-50%, -140%)',
              }}
            >
              {Math.round(last.retention * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
