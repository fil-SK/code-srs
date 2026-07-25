import { ChevronRight, Flag, Flame, Target, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function MomentumRow({
  icon: Icon,
  label,
  value,
  progress,
  chevron,
}: {
  icon: LucideIcon
  label: string
  value: string
  progress?: number // 0-1, omitted rows show a value only, no bar
  chevron?: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="grid h-9 w-9 flex-none place-items-center rounded-full border border-itera-border bg-itera-surface text-itera-accent">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-itera-ink">{label}</span>
          <span className="truncate text-sm font-semibold text-itera-ink-brand">
            {value}
          </span>
        </div>
        {progress != null && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-itera-pill bg-itera-border">
            <div
              className="h-full rounded-itera-pill bg-itera-accent"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>
      {chevron && <ChevronRight size={16} className="flex-none text-itera-muted" />}
    </div>
  )
}

// Placeholder content — no streak/goal/milestone tracking exists yet
// (docs/itera-decisions.md). Structure and mark choices (thin single-hue
// progress bars, no rainbow, status color reserved) follow the dataviz
// skill's guidance even though the numbers themselves are illustrative.
export function MomentumPanel() {
  return (
    <div className="rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]">
      <div className="text-xs font-bold uppercase tracking-wide text-itera-muted">
        Momentum
      </div>
      <div className="mt-1 divide-y divide-itera-border">
        <MomentumRow icon={Flame} label="7-day streak" value="7 days" />
        <MomentumRow
          icon={TrendingUp}
          label="Weekly sessions"
          value="4 of 5"
          progress={4 / 5}
        />
        <MomentumRow icon={Target} label="Recent recall" value="82%" progress={0.82} />
        <MomentumRow
          icon={Flag}
          label="Next milestone"
          value="Finish Type Deduction"
          chevron
        />
      </div>
    </div>
  )
}
