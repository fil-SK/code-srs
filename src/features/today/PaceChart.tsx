// Placeholder series (docs/itera-decisions.md). No real pace tracking exists
// yet. The chart is hand-rolled SVG to preserve the project's no-charting-
// dependency convention while matching the supplied dashboard composition.
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const VALUES = [4, 9, 13, 11, 17, 12, 14]

const WIDTH = 390
const HEIGHT = 164
const LEFT = 42
const RIGHT = 12
const TOP = 12
const BOTTOM = 28
const MAX_MINUTES = 20

function chartPoint(value: number, index: number): [number, number] {
  const x = LEFT + (index / (VALUES.length - 1)) * (WIDTH - LEFT - RIGHT)
  const y = TOP + (1 - value / MAX_MINUTES) * (HEIGHT - TOP - BOTTOM)
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

export function PaceChart() {
  const points = VALUES.map(chartPoint)
  const linePath = smoothPath(points)
  const first = points[0]
  const last = points[points.length - 1]
  const chartBottom = HEIGHT - BOTTOM
  const areaPath = `${linePath} L ${last[0]} ${chartBottom} L ${first[0]} ${chartBottom} Z`

  return (
    <section
      aria-labelledby="pace-heading"
      className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]"
    >
      <h2 id="pace-heading" className="text-base font-semibold text-itera-ink-brand">
        Today&rsquo;s pace
      </h2>
      <p className="mt-1 text-xs font-medium text-itera-success">You&rsquo;re on track</p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Minutes studied this week: 4 Monday, 9 Tuesday, 13 Wednesday, 11 Thursday, 17 Friday, 12 Saturday, and 14 Sunday"
      >
        <defs>
          <linearGradient id="pace-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--itera-accent)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--itera-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 10, 20].map((minutes) => {
          const y = TOP + (1 - minutes / MAX_MINUTES) * (HEIGHT - TOP - BOTTOM)
          return (
            <g key={minutes}>
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
                {minutes}m
              </text>
            </g>
          )
        })}

        {DAYS.map((day, index) => {
          const [x] = chartPoint(0, index)
          return (
            <text
              key={`${day}-${index}`}
              x={x}
              y={HEIGHT - 5}
              textAnchor="middle"
              fill="var(--itera-muted)"
              fontSize="11"
              fontFamily="var(--font-itera-sans)"
            >
              {day}
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
