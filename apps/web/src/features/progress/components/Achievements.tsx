import { Check } from 'lucide-react'
import { selectNextAchievement, type Achievement } from '@fliptap/core'
import { AchievementIcon } from '@/components/icons/AchievementIcon'
import { cn } from '@/lib/cn'

export function Achievements({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter((item) => item.unlockedAt !== undefined).length
  const next = selectNextAchievement(achievements)?.id
  return (
    <section aria-labelledby="achievements-heading" className="progress-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="achievements-heading" className="text-base font-semibold text-fliptap-ink-brand">Achievements</h2>
        <span className="text-xs font-medium text-fliptap-muted">{earned} of 4 earned</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-fliptap-muted">Small steps. Lasting habits. Based on your scheduled reviews, across all time.</p>
      <ul className="mt-3 space-y-1.5">
        {achievements.map((item) => {
          const unlocked = item.unlockedAt !== undefined
          return (
            <li key={item.id} className={cn('flex items-start gap-3 rounded-fliptap-control border px-2.5 py-2',
              unlocked ? 'border-fliptap-success/30 bg-fliptap-success-soft/60' : 'border-transparent')}>
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-fliptap-control',
                unlocked ? 'bg-fliptap-success-soft text-fliptap-success' : 'bg-fliptap-navy-soft text-fliptap-muted')}>
                <AchievementIcon id={item.id} size={25} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <h3 className="text-xs font-semibold text-fliptap-ink-brand">{item.title}</h3>
                  {unlocked ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-fliptap-success"><Check size={12} aria-hidden="true" /> Earned</span>
                    : item.id === next ? <span className="rounded-fliptap-pill bg-fliptap-navy-soft px-2 py-0.5 text-[10px] font-semibold text-fliptap-muted">Next up</span> : null}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-fliptap-muted">{item.description}</p>
                {unlocked ? <p className="mt-1 text-[10px] text-fliptap-muted">Earned {new Date(item.unlockedAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  : <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div role="progressbar" aria-label={item.title} aria-valuemin={0} aria-valuemax={item.target} aria-valuenow={item.progress} aria-valuetext={item.progressLabel}
                      className="h-1 min-w-16 flex-1 overflow-hidden rounded-full bg-fliptap-navy-soft">
                      <div className="h-full rounded-full bg-fliptap-muted-light" style={{ width: `${item.progress / item.target * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-fliptap-muted">{item.progressLabel}</p>
                  </div>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
