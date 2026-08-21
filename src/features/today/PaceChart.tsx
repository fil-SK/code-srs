import type { PaceDay } from '@/domain/stats/todayMetrics'

// Real seven-day activity: one bucket per local calendar day, counting
// reviews completed. It replaced a hard-coded minute series
// (`[4,9,13,11,17,12,14]` against a fixed 20-minute axis) and the caption
// "You're on track", which claimed progress toward a goal this product does
// not have. There is deliberately no target line here for the same reason.
//
// Still hand-rolled SVG - the no-charting-dependency convention is unchanged.
const WIDTH = 390
const HEIGHT = 164
const LEFT = 42
const RIGHT = 12
const TOP = 12
const BOTTOM = 28

// Floor on the axis so a one-review day does not fill the panel and read as a
// huge day.
const MIN_AXIS_MAX = 4

function axisMaxFor(counts: number[]): number {
  const peak = Math.max(MIN_AXIS_MAX, ...counts)
  // Round up to something the three ticks can divide evenly.
  return Math.ceil(peak / 2) * 2
}

function chartPoint(value: number, index: number, count: number, axisMax: number): [number, number] {
  const x = LEFT + (index / Math.max(1, count - 1)) * (WIDTH - LEFT - RIGHT)
  const y = TOP + (1 - value / axisMax) * (HEIGHT - TOP - BOTTOM)
  return [x, y]
}

function smoothPath(points: [number, number][]): string {
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point[0]} ${point[1]}`

    const previous = points[index - 1]
    const controlX = (previous[0] + point[0]) / 2
    return `${path} C ${controlX} ${previous[1]}, ${controlX} ${point[1]}, ${point[0]} ${point[1]}`
  }, '')
}

const DAY_NAME = new Intl.DateTimeFormat('en-US', { weekday: 'long' })

export function PaceChart({ days }: { days: PaceDay[] }) {
  const counts = days.map((d) => d.count)
  const axisMax = axisMaxFor(counts)
  const total = counts.reduce((sum, n) => sum + n, 0)

  const points = days.map((day, index) => chartPoint(day.count, index, days.length, axisMax))
  const linePath = smoothPath(points)
  const first = points[0]
  const last = points[points.length - 1]
  const chartBottom = HEIGHT - BOTTOM
  const areaPath = `${linePath} L ${last[0]} ${chartBottom} L ${first[0]} ${chartBottom} Z`

  const description = days
    .map((d) => `${DAY_NAME.format(new Date(d.date))} ${d.count}`)
    .join(', ')

  return (
    <section
      aria-labelledby="pace-heading"
      className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]"
    >
      <h2 id="pace-heading" className="text-base font-semibold text-itera-ink-brand">
        Today&rsquo;s pace
      </h2>
      <p className="mt-1 text-xs font-medium text-itera-muted">
        {total === 0 ? 'No reviews in the last 7 days' : 'Reviews completed per day'}
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Reviews completed per day over the last seven days: ${description}`}
      >
        <defs>
          <linearGradient id="pace-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--itera-accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--itera-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, axisMax / 2, axisMax].map((tick) => {
          const y = TOP + (1 - tick / axisMax) * (HEIGHT - TOP - BOTTOM)
          return (
            <g key={tick}>
              <line
                x1={LEFT}
                x2={WIDTH - RIGHT}
                y1={y}
                y2={y}
                stroke="var(--itera-border)"
                strokeWidth="1"
              />
              <text
                x={0}
                y={y + 4}
                fill="var(--itera-muted)"
                fontSize="11"
                fontFamily="var(--font-itera-sans)"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {days.map((day, index) => {
          const [x] = chartPoint(0, index, days.length, axisMax)
          return (
            <text
              key={day.date}
              x={x}
              y={HEIGHT - 5}
              textAnchor="middle"
              fill="var(--itera-muted)"
              fontSize="11"
              fontFamily="var(--font-itera-sans)"
            >
              {day.label}
            </text>
          )
        })}

        <path d={areaPath} fill="url(#pace-area)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--itera-accent)"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--itera-accent)" />

        {/* Shifted left of the end point so the callout cannot clip the SVG's
            right edge (found in an earlier browser pass). */}
        <g transform={`translate(${last[0] - 66} ${last[1] - 34})`}>
          <rect width="60" height="24" rx="6" fill="var(--itera-navy-soft)" />
          <text
            x="30"
            y="16"
            textAnchor="middle"
            fill="var(--itera-ink-brand)"
            fontSize="11"
            fontWeight="600"
            fontFamily="var(--font-itera-sans)"
          >
            Today
          </text>
        </g>
      </svg>
    </section>
  )
}
