import { useMemo } from 'react'
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

  // A handful of evenly-spaced x-axis date labels rather than one per bucket.
  const labelCount = Math.min(5, points.length)
  const labelIndices =
    labelCount <= 1
      ? [0]
      : Array.from({ length: labelCount }, (_, i) => Math.round((i / (labelCount - 1)) * (points.length - 1)))

  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-itera-ink-brand">Retention over time</h3>
            <Info size={14} strokeWidth={1.9} className="text-itera-muted" aria-hidden="true" />
          </div>
          <p className="text-xs text-itera-muted">Your ability to recall cards</p>
        </div>
        <DeckScopeDropdown
          options={[{ value: 'all', label: 'All decks' }, ...deckOptions]}
          value={selectedDeckId}
          onChange={onDeckChange}
        />
      </div>

      {known.length < 2 ? (
        <p className="mt-8 text-sm text-itera-muted">Not enough review history yet to chart a trend.</p>
      ) : (
        <div className="relative mt-4">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Retention rate over time">
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <line
                key={v}
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="var(--itera-border)"
                strokeWidth="1"
              />
            ))}

            {average !== null && (
              <line
                x1={PAD_X}
                x2={WIDTH - PAD_X}
                y1={yFor(average)}
                y2={yFor(average)}
                stroke="var(--itera-border-strong)"
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
                stroke="var(--itera-accent)"
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
                fill="var(--itera-accent)"
              />
            ))}

            {last && (
              <>
                <circle cx={lastX} cy={lastY} r="4.5" fill="var(--itera-accent)" />
                <circle cx={lastX} cy={lastY} r="4.5" fill="none" stroke="var(--itera-surface)" strokeWidth="2" />
              </>
            )}

            {labelIndices.map((i) => (
              <text
                key={i}
                x={xFor(i, points.length)}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                className="fill-itera-muted text-[10px]"
              >
                {DATE_LABEL.format(new Date(points[i].bucketStart))}
              </text>
            ))}
          </svg>

          {last && (
            <span
              className="absolute rounded-itera-pill bg-itera-accent px-2 py-0.5 text-xs font-semibold text-white"
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
