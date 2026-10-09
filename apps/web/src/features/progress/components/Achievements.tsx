import { useState } from 'react'
import { Check, LockKeyhole, ChartNoAxesColumnIncreasing } from 'lucide-react'
import { selectNextAchievement, type Achievement } from '@fliptap/core'
import { cn } from '@/lib/cn'
import { DeckScopeDropdown } from './DeckScopeDropdown'
import { AchievementEmblem, AchievementPath, AchievementTrophy } from './AchievementArtwork'

const FILTERS = [
  { value: 'all', label: 'All achievements' },
  { value: 'earned', label: 'Earned' },
  { value: 'pending', label: 'Not yet earned' },
]

function MilestoneProgress({ item, label = item.title }: { item: Achievement; label?: string }) {
  return (
    <div className="mt-3 space-y-2">
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={item.target}
        aria-valuenow={item.progress} aria-valuetext={item.progressLabel} className="achievement-track">
        <div className="h-full rounded-full bg-fliptap-selection-border" style={{ width: `${item.progress / item.target * 100}%` }} />
      </div>
      <p className="text-xs leading-relaxed text-fliptap-muted">{item.progressLabel}</p>
    </div>
  )
}

export function Achievements({ achievements }: { achievements: Achievement[] }) {
  const [filter, setFilter] = useState('all')
  const earnedCount = achievements.filter((item) => item.unlockedAt !== undefined).length
  const percent = achievements.length ? Math.round(earnedCount / achievements.length * 100) : 0
  const next = selectNextAchievement(achievements)
  const visible = achievements.filter((item) => filter === 'all' || (filter === 'earned' ? item.unlockedAt !== undefined : item.unlockedAt === undefined))

  return (
    <div className="space-y-4">
      <section aria-labelledby="achievement-summary-heading" className="progress-panel achievement-summary">
        <div className="achievement-summary-copy">
          <h2 id="achievement-summary-heading" className="progress-metric-label">Your progress</h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-semibold leading-none tracking-tight text-fliptap-ink-brand">
              <span className="text-[42px] tabular-nums">{earnedCount}</span><span className="ml-2 text-2xl text-fliptap-muted">of {achievements.length}</span>
            </p>
            <p className="text-xs text-fliptap-muted">milestones earned</p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div role="progressbar" aria-label="Milestones earned" aria-valuemin={0} aria-valuemax={achievements.length}
              aria-valuenow={earnedCount} aria-valuetext={`${earnedCount} of ${achievements.length} milestones earned`} className="achievement-track flex-1">
              <div className="h-full rounded-full bg-fliptap-accent" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs font-medium tabular-nums text-fliptap-muted">{percent}%</span>
          </div>
        </div>
        <AchievementTrophy />
        <p className="achievement-summary-note text-sm leading-relaxed text-fliptap-muted">Small steps.<br />Lasting knowledge.</p>
      </section>

      <section aria-labelledby="achievement-next-heading" className="progress-panel achievement-next">
        <div className="achievement-next-copy">
          <h2 id="achievement-next-heading" className="text-lg font-semibold text-fliptap-ink-brand">{next ? 'Up next' : 'Every milestone earned'}</h2>
          <p className="mt-1 text-xs leading-relaxed text-fliptap-muted">{next ? 'Your next milestone, one study session at a time.' : 'All four milestones are part of your story. Keep building on them.'}</p>
          {next && (
            <div className="mt-4 flex items-start gap-4">
              <span className="achievement-mark shrink-0"><AchievementEmblem id={next.id} /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-fliptap-ink-brand">{next.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-fliptap-muted">{next.description}</p>
                <MilestoneProgress item={next} label={`Next milestone: ${next.title}`} />
              </div>
            </div>
          )}
        </div>
        <AchievementPath />
      </section>

      <section aria-labelledby="achievement-collection-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="achievement-collection-heading" className="text-lg font-semibold text-fliptap-ink-brand">All achievements</h2>
            <p className="mt-1 text-xs text-fliptap-muted">Small steps. Lasting habits. Based on your scheduled reviews, across all time.</p>
          </div>
          <DeckScopeDropdown options={FILTERS} value={filter} onChange={setFilter} />
        </div>
        <ul className="achievement-grid">
          {visible.map((item) => {
            const earned = item.unlockedAt !== undefined
            const inProgress = !earned && item.progress > 0
            const StatusIcon = earned ? Check : inProgress ? ChartNoAxesColumnIncreasing : LockKeyhole
            return (
              <li key={item.id} className="progress-panel achievement-card" data-earned={earned}>
                <span className={cn('achievement-mark', earned && 'achievement-mark-earned')}><AchievementEmblem id={item.id} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="pt-1 text-sm font-semibold text-fliptap-ink-brand">{item.title}</h3>
                    <span className={cn('inline-flex items-center gap-1 rounded-fliptap-control border px-2 py-1 text-[10px] font-medium',
                      earned ? 'border-fliptap-success/20 bg-fliptap-success-soft text-fliptap-success' : 'border-fliptap-border bg-fliptap-surface-subtle text-fliptap-muted')}>
                      <StatusIcon size={12} aria-hidden="true" />{earned ? 'Earned' : inProgress ? 'In progress' : 'Locked'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-fliptap-muted">{item.description}</p>
                  {earned ? <p className="mt-3 text-xs text-fliptap-muted">Earned <time dateTime={new Date(item.unlockedAt!).toISOString()}>{new Date(item.unlockedAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></p>
                    : <MilestoneProgress item={item} />}
                </div>
              </li>
            )
          })}
        </ul>
        {visible.length === 0 && <p role="status" className="progress-panel px-6 py-8 text-sm text-fliptap-muted">{filter === 'earned' ? 'No milestones earned yet. Your first scheduled session is a good place to start.' : 'All four milestones earned. Your collection is complete.'}</p>}
      </section>
    </div>
  )
}