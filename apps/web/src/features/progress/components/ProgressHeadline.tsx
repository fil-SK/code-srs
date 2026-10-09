import { ArrowRight, ClockCheck, Copy, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { KpiSet, MomentumSummary } from '@fliptap/core'
import { formatDayCount } from '@fliptap/core'
import { StreakFlameIcon } from '@/components/icons/StreakFlameIcon'
import { KpiDelta } from './KpiTile'
import type { ReactNode } from 'react'

export function StreakCard({ kpis, momentum }: { kpis: KpiSet; momentum: MomentumSummary }) {
  return (
    <section role="group" aria-label="Current streak" className="progress-panel progress-streak overflow-hidden p-5">
      <StreakFlameIcon size={106} className="pointer-events-none absolute right-2 top-12 text-fliptap-accent opacity-[.08]" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        <span className="progress-metric-icon bg-fliptap-accent-soft text-fliptap-accent"><StreakFlameIcon size={24} aria-hidden="true" /></span>
        <h2 className="progress-metric-label">Current streak</h2>
      </div>
      <p className="relative mt-5 text-[40px] font-bold leading-none tracking-tight text-fliptap-ink-brand">{formatDayCount(kpis.streak)}</p>
      <p className="mt-2 text-sm text-fliptap-muted">Best: {formatDayCount(kpis.bestStreak)}</p>
      <ul className="relative mt-7 grid grid-cols-7 gap-1" aria-label="Last seven study days">
        {momentum.days.map((day) => (
          <li key={day.date} className="flex min-w-0 flex-col items-center gap-2" aria-label={`${day.dateLabel}: ${day.studied ? 'studied' : 'no reviews'}`}>
            <span className={`grid size-7 place-items-center rounded-full border ${day.studied ? 'border-fliptap-accent/25 bg-fliptap-accent-soft text-fliptap-accent' : 'border-fliptap-border bg-fliptap-surface/50 text-fliptap-muted-light'}`}>
              {day.studied && <StreakFlameIcon size={16} aria-hidden="true" />}
            </span>
            <span className="text-[10px] text-fliptap-muted">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-fliptap-muted">{momentum.status}</p>
    </section>
  )
}

export function DueCard({ due }: { due: number }) {
  return (
    <section role="group" aria-label="Cards due" className="progress-panel progress-due min-h-[280px] overflow-hidden p-5">
      <div className="flex items-center gap-3">
        <span className="progress-metric-icon bg-fliptap-selection-soft text-fliptap-ink-brand"><ClockCheck size={23} strokeWidth={1.8} aria-hidden="true" /></span>
        <h2 className="progress-metric-label">Cards due</h2>
      </div>
      <ClockCheck size={78} strokeWidth={1.1} className="pointer-events-none absolute right-3 top-[90px] text-fliptap-selection-border opacity-40" aria-hidden="true" />
      <p className="relative mt-5 text-5xl font-bold leading-none tracking-tight text-fliptap-ink-brand">{due.toLocaleString()}</p>
      <p className="relative mt-2 text-sm text-fliptap-muted">{due > 0 ? 'Due now' : 'All caught up'}</p>
      <Link to={due > 0 ? '/review' : '/decks'}
        className="fliptap-button fliptap-button-primary relative mt-auto flex min-h-11 items-center justify-center gap-2 rounded-fliptap-control px-3 py-3 text-sm font-semibold text-white">
        {due > 0 ? 'Review now' : 'Browse library'}<ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  )
}

function CompactMetric({ label, value, icon: Icon, footer }: {
  label: string; value: number; icon: typeof GraduationCap; footer: ReactNode
}) {
  return (
    <section role="group" aria-label={label} className="progress-panel progress-compact-metric">
      <span className="progress-metric-icon bg-fliptap-navy-soft text-fliptap-ink-brand"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
      <div className="min-w-0">
        <h2 className="progress-metric-label">{label}</h2>
        <p className="progress-compact-value font-bold text-fliptap-ink-brand">{value.toLocaleString()}</p>
        <div className="progress-compact-caption text-fliptap-muted">{footer}</div>
      </div>
      <svg className="progress-compact-bars" width="36" height="40" viewBox="0 0 36 40" aria-hidden="true">
        <rect x="1" y="23" width="8" height="16" rx="4" />
        <rect x="14" y="13" width="8" height="26" rx="4" />
        <rect x="27" y="2" width="8" height="37" rx="4" />
      </svg>
    </section>
  )
}

export function SecondaryMetrics({ kpis, comparisonLabel }: { kpis: KpiSet; comparisonLabel: string }) {
  return (
    <div className="progress-secondary">
      <CompactMetric label="Learned" value={kpis.learned.value} icon={GraduationCap}
        footer={`of ${kpis.learned.total.toLocaleString()} active cards`} />
      <CompactMetric label="Reviews" value={kpis.reviews.value} icon={Copy}
        footer={<KpiDelta delta={kpis.reviews.deltaPct} comparisonLabel={comparisonLabel} />} />
    </div>
  )
}
