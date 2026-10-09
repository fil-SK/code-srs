import { useId, useMemo, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { RetentionIcon } from '@/components/icons/ApprovedIcons'
import { buildRetentionGeometry, CHART_HEIGHT as HEIGHT, CHART_WIDTH as WIDTH, PAD_X, xFor, yFor, type RetentionPoint } from '@fliptap/core'
import { DeckScopeDropdown, type DropdownOption } from './DeckScopeDropdown'

const DATE_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const FULL_DATE_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function bucketLabel(point: RetentionPoint): string {
  const start = new Date(point.bucketStart)
  const end = new Date(point.bucketEnd - 1)
  if (start.toDateString() === end.toDateString()) return FULL_DATE_LABEL.format(start)
  return `${DATE_LABEL.format(start)} – ${FULL_DATE_LABEL.format(end)}`
}

export function RetentionChart({ points, deckOptions, selectedDeckId, onDeckChange, value, footer }: {
  points: RetentionPoint[]
  deckOptions: DropdownOption[]
  selectedDeckId: string
  onDeckChange: (deckId: string) => void
  value?: number | null
  footer?: ReactNode
}) {
  const gradientId = useId()
  const known = points.filter((p) => p.retention !== null)
  const geometry = useMemo(() => buildRetentionGeometry(points), [points])
  const last = known[known.length - 1]
  const lastX = last ? xFor(points.indexOf(last), points.length) : 0
  const lastY = last?.retention != null ? yFor(last.retention) : 0
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredPoint = hovered !== null ? points[hovered] : null
  const hoveredX = hovered !== null ? xFor(hovered, points.length) : 0
  const hoveredY = hoveredPoint?.retention != null ? yFor(hoveredPoint.retention) : HEIGHT / 2
  const columnWidth = points.length > 1 ? (WIDTH - 2 * PAD_X) / (points.length - 1) : WIDTH - 2 * PAD_X
  const indices = points.length ? [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])] : []

  return (
    <section role="group" aria-label="Retention rate" className="progress-panel progress-retention flex flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="progress-metric-icon bg-fliptap-success-soft text-fliptap-success"><RetentionIcon size={24} aria-hidden="true" /></span>
          <h2 className="progress-metric-label flex items-center gap-2">Retention rate
            <Info size={13} aria-hidden="true"><title>Successful recalls of mature cards in the selected period.</title></Info>
          </h2>
        </div>
        <DeckScopeDropdown options={[{ value: 'all', label: 'All decks' }, ...deckOptions]} value={selectedDeckId} onChange={onDeckChange} />
      </div>
      {value !== undefined && <p className="mt-2 text-[40px] font-bold leading-none tracking-tight text-fliptap-ink-brand">{value === null ? '—' : `${Math.round(value * 100)}%`}</p>}
      <p className="mt-1 text-xs text-fliptap-muted">Your ability to recall mature cards</p>
      {known.length < 2 ? (
        <p className="my-auto py-8 text-sm leading-relaxed text-fliptap-muted">Not enough review history yet to chart a trend.</p>
      ) : (
        <div className="relative mt-3 pl-9">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-7 text-right text-[10px] text-fliptap-muted">
            {[1, .75, .5, .25, 0].map((v) => <span key={v} className="absolute right-0" style={{ top: `${yFor(v) / HEIGHT * 96}px`, transform: 'translateY(-50%)' }}>{v * 100}%</span>)}
          </div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-[96px] w-full overflow-visible" role="img" aria-label="Retention rate over time" onPointerLeave={() => setHovered(null)}>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--fliptap-accent)" stopOpacity=".18" /><stop offset="100%" stopColor="var(--fliptap-accent)" stopOpacity="0" /></linearGradient></defs>
            {[0, .25, .5, .75, 1].map((v) => <line key={v} x1={PAD_X} x2={WIDTH - PAD_X} y1={yFor(v)} y2={yFor(v)} stroke="var(--fliptap-border)" />)}
            {indices.map((i) => <line key={i} x1={xFor(i, points.length)} x2={xFor(i, points.length)} y1={yFor(1)} y2={yFor(0)} stroke="var(--fliptap-border)" />)}
            {geometry.segments.map((path) => {
              const coordinates = path.split(' ')
              const startX = coordinates[1]
              const endX = coordinates[coordinates.length - 2]
              return <g key={path}>
                <path d={`${path} L ${endX} ${yFor(0)} L ${startX} ${yFor(0)} Z`} fill={`url(#${gradientId})`} />
                <path data-retention-segment="true" d={path} fill="none" stroke="var(--fliptap-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            })}
            {geometry.isolated.map((marker) => <ellipse key={marker.index} data-retention-point="true" cx={marker.x} cy={marker.y} rx="5" ry="5" fill="var(--fliptap-accent)" />)}
            {last && <ellipse cx={lastX} cy={lastY} rx="5" ry="6" fill="var(--fliptap-accent)" />}
            {points.map((point, i) => <rect key={point.bucketStart} x={Math.max(PAD_X, xFor(i, points.length) - columnWidth / 2)} y="0" width={Math.min(columnWidth, WIDTH - PAD_X - Math.max(PAD_X, xFor(i, points.length) - columnWidth / 2))} height={HEIGHT} fill="transparent"
              tabIndex={0} role="button" aria-label={`${bucketLabel(point)}: ${point.retention === null ? 'No mature reviews' : `${Math.round(point.retention * 100)}% retention`}`}
              className="focus:outline-none focus:stroke-fliptap-selection-border" onPointerEnter={() => setHovered(i)} onFocus={() => setHovered(i)} onBlur={() => setHovered(null)} />)}
          </svg>
          <div aria-hidden="true" className="flex justify-between gap-2 text-[10px] text-fliptap-muted">{indices.map((i) => <span key={i}>{DATE_LABEL.format(new Date(points[i].bucketStart))}</span>)}</div>
          {hoveredPoint && <div role="tooltip" className="pointer-events-none absolute z-10 max-w-full rounded-fliptap-control bg-fliptap-navy px-2.5 py-1.5 text-[11px] text-white shadow-md"
            style={{ left: `calc(36px + (100% - 36px) * ${hoveredX / WIDTH})`, top: hoveredY / HEIGHT * 96, transform: `translate(${hoveredX / WIDTH < .2 ? '0' : hoveredX / WIDTH > .8 ? '-100%' : '-50%'}, -110%)` }}>
            <div className="font-semibold">{bucketLabel(hoveredPoint)}</div>
            <div>{hoveredPoint.retention === null ? 'No mature reviews in this period' : `${Math.round(hoveredPoint.retention * 100)}% retention`}</div>
          </div>}
          {last?.retention != null && hovered === null && <span className="pointer-events-none absolute rounded-fliptap-pill bg-fliptap-accent px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ left: `calc(36px + (100% - 36px) * ${lastX / WIDTH})`, top: lastY / HEIGHT * 96, transform: `translate(${lastX / WIDTH > .85 ? '-100%' : '-50%'}, -130%)` }}>{Math.round(last.retention * 100)}%</span>}
        </div>
      )}
      {footer && <div className="mt-2 text-[10px] leading-relaxed">{footer}</div>}
    </section>
  )
}
