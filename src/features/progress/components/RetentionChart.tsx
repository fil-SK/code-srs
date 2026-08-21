import { useMemo } from 'react'
import { Info } from 'lucide-react'
import type { RetentionPoint } from '@/domain/stats/progressMetrics'
import { DeckScopeDropdown, type DropdownOption } from './DeckScopeDropdown'
import { buildRetentionLinePaths } from './retentionChartPath'

const WIDTH = 640
const HEIGHT = 200
const PAD_X = 8
const PAD_TOP = 16
const PAD_BOTTOM = 24

const DATE_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function xFor(i: number, count: number): number {
  if (count <= 1) return PAD_X
  return PAD_X + (i / (count - 1)) * (WIDTH - PAD_X * 2)
}

function yFor(value: number): number {
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  return PAD_TOP + (1 - value) * plotHeight
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

  const linePaths = useMemo(() => buildRetentionLinePaths(points), [points])

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

            {linePaths.map((linePath) => (
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
