import { ChevronRight } from 'lucide-react'

// Placeholder series (docs/itera-decisions.md) — no real pace/projection
// tracking exists yet. Hand-rolled SVG, matching this codebase's existing
// "no charting library" convention (see RoadmapCanvas.tsx). Mark choices
// follow the dataviz skill: one shared axis (not dual-axis — both series are
// the same measure, sessions completed, actual vs. target), thin 2px lines
// with rounded caps, a single accent hue reserved for the real series (the
// target/projection line stays neutral, dashed, unlabeled-by-color), and one
// direct end-point marker rather than a point on every value.
const ACTUAL = [0, 1, 2, 2.4, 3.6, 4.8, 5.6]
const TARGET = [0, 0.83, 1.67, 2.5, 3.33, 4.17, 5]

const WIDTH = 320
const HEIGHT = 120
const PAD = 8

function points(series: number[]): [number, number][] {
  const max = Math.max(...ACTUAL, ...TARGET)
  const stepX = (WIDTH - PAD * 2) / (series.length - 1)
  return series.map((v, i) => [
    PAD + i * stepX,
    HEIGHT - PAD - (v / max) * (HEIGHT - PAD * 2),
  ])
}

function pathFrom(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

export function PaceChart() {
  const actualPts = points(ACTUAL)
  const targetPts = points(TARGET)
  const last = actualPts[actualPts.length - 1]
  const areaPath =
    `${pathFrom(actualPts)} ` +
    `L ${last[0].toFixed(1)} ${HEIGHT - PAD} L ${actualPts[0][0].toFixed(1)} ${HEIGHT - PAD} Z`

  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]">
      <div className="text-xs font-bold uppercase tracking-wide text-itera-muted">
        Today&rsquo;s pace
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label="Sessions completed this week, actual versus target pace"
      >
        <defs>
          <linearGradient id="pace-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--itera-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--itera-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#pace-area)" stroke="none" />
        <path
          d={pathFrom(targetPts)}
          fill="none"
          stroke="var(--itera-border-strong)"
          strokeWidth="2"
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
        <path
          d={pathFrom(actualPts)}
          fill="none"
          stroke="var(--itera-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--itera-accent)" />
        <circle
          cx={last[0]}
          cy={last[1]}
          r="4.5"
          fill="none"
          stroke="var(--itera-surface)"
          strokeWidth="2"
        />
      </svg>

      <p className="mt-2 text-sm font-semibold text-itera-ink-brand">You&rsquo;re right on track.</p>
      <p className="text-sm text-itera-muted">Keep this pace to complete 5 sessions by Friday.</p>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-0.5 text-sm font-semibold text-itera-accent hover:text-itera-accent-hover"
      >
        View weekly outlook
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
