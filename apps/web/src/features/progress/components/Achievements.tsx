import { Check } from 'lucide-react'
import type { Achievement } from '@fliptap/core'
import { AchievementIcon } from '@/components/icons/AchievementIcon'
import { cn } from '@/lib/cn'

export function Achievements({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter((item) => item.unlockedAt !== undefined).length
  const next = achievements.find((item) => item.unlockedAt === undefined)?.id
  return (
    <section aria-labelledby="achievements-heading"
      className="rounded-fliptap-card border border-fliptap-border bg-fliptap-surface p-5 shadow-[var(--fliptap-shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="achievements-heading" className="text-base font-semibold text-fliptap-ink-brand">Achievements</h2>
        <span className="text-xs font-medium text-fliptap-muted">{earned} of 4 earned</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-fliptap-muted">Small steps. Lasting habits. Based on your scheduled reviews, across all time.</p>
      <ul className="mt-4 divide-y divide-fliptap-border">
        {achievements.map((item) => {
          const unlocked = item.unlockedAt !== undefined
          return (
            <li key={item.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-full',
                unlocked ? 'bg-fliptap-navy-soft text-fliptap-ink-brand' : 'bg-fliptap-surface-subtle text-fliptap-muted')}>
                <AchievementIcon id={item.id} size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <h3 className="text-sm font-semibold text-fliptap-ink-brand">{item.title}</h3>
                  {unlocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-fliptap-success">
                      <Check size={13} aria-hidden="true" /> Earned
                    </span>
                  ) : item.id === next ? (
                    <span className="rounded-fliptap-pill bg-fliptap-accent-soft px-2 py-0.5 text-[11px] font-semibold text-fliptap-ink-brand">Next up</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-fliptap-muted">{item.description}</p>
                {unlocked ? (
                  <p className="mt-2 text-xs text-fliptap-muted">
                    Earned {new Date(item.unlockedAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                ) : (
                  <div className="mt-2.5">
                    <div role="progressbar" aria-label={item.title} aria-valuemin={0}
                      aria-valuemax={item.target} aria-valuenow={item.progress} aria-valuetext={item.progressLabel}
                      className="h-1 overflow-hidden rounded-full bg-fliptap-navy-soft">
                      <div className="h-full rounded-full bg-fliptap-ink-brand/60" style={{ width: `${item.progress / item.target * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-fliptap-muted">{item.progressLabel}</p>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}