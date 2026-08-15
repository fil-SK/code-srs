import { Flag, Flame, Target, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function MetricIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-itera-accent-soft text-itera-accent">
      <Icon size={15} aria-hidden="true" />
    </div>
  )
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100)

  return (
    <div
      className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-itera-pill bg-itera-border"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <div
        className="h-full rounded-itera-pill bg-itera-accent"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// Placeholder content. No streak/goal/milestone tracking exists yet
// (docs/itera-decisions.md). This composition follows the supplied dashboard
// direction while preserving the existing icon set and illustrative values.
export function MomentumPanel() {
  return (
    <section
      aria-labelledby="momentum-heading"
      className="flex min-h-[345px] flex-col rounded-itera-card border border-itera-border bg-itera-surface p-5 shadow-[var(--itera-shadow-card)]"
    >
      <h2 id="momentum-heading" className="text-base font-semibold text-itera-ink-brand">
        Momentum
      </h2>

      <div className="mt-5 flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-3">
          <MetricIcon icon={Flame} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-itera-ink-brand">7-day streak</div>
            <div className="mt-0.5 text-xs text-itera-muted">Keep it going!</div>
          </div>
          <div className="text-2xl font-semibold leading-none text-itera-ink-brand">7</div>
        </div>

        <div className="flex items-center gap-3">
          <MetricIcon icon={TrendingUp} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-itera-ink-brand">Weekly goal</div>
            <div className="mt-1 flex items-center gap-4">
              <span className="flex-none text-xs text-itera-muted">4 of 5 sessions</span>
              <ProgressBar label="Weekly goal progress" value={4 / 5} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MetricIcon icon={Target} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-itera-ink-brand">Recall rate</div>
            <div className="mt-0.5 text-xs font-medium text-itera-success">
              +6% from last week
            </div>
          </div>
          <div className="text-sm font-bold text-itera-ink-brand">82%</div>
        </div>

        <div className="mt-auto border-t border-itera-border pt-4">
          <div className="mb-3 text-xs font-semibold text-itera-ink-brand">Next milestone</div>
          <div className="flex items-center gap-3">
            <MetricIcon icon={Flag} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-itera-ink-brand">
                Finish Type Deduction
              </div>
              <div className="mt-1 flex items-center gap-4">
                <span className="flex-none text-xs text-itera-muted">12 / 18 topics mastered</span>
                <ProgressBar label="Type Deduction milestone progress" value={12 / 18} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
