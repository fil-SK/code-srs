import { useMemo } from 'react'
import { useSearchCards } from '@/hooks/useCards'
import { useReviewLogs } from '@/hooks/useReview'
import { computeStats } from '@/domain/stats/computeStats'

export function StatsPage() {
  const now = useMemo(() => Date.now(), [])
  const logs = useReviewLogs()
  const cards = useSearchCards({ includeSuspended: true })

  const stats = useMemo(
    () => computeStats(logs.data ?? [], cards.data ?? [], now),
    [logs.data, cards.data, now],
  )

  if (logs.isLoading) return <p className="text-sm text-muted">Loading…</p>

  const maxPerDay = Math.max(1, ...stats.reviewsPerDay)
  const maxForecast = Math.max(1, ...stats.forecast)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat
          label="Streak"
          value={`${stats.streak}`}
          hint={`day${stats.streak === 1 ? '' : 's'} 🔥`}
        />
        <Stat
          label="Retention (30d)"
          value={stats.retention === null ? '—' : `${Math.round(stats.retention * 100)}%`}
          hint={`${stats.reviewsLast30} reviews`}
        />
        <Stat label="Total reviews" value={`${stats.totalReviews}`} hint="all time" />
      </div>

      <Panel title="Reviews per day (last 14 days)">
        <div className="flex h-32 items-end gap-1.5">
          {stats.reviewsPerDay.map((count, i) => (
            <div
              key={i}
              title={`${count} review${count === 1 ? '' : 's'}`}
              className="flex-1 rounded-t bg-accent-soft"
              style={{ height: `${Math.max(2, (count / maxPerDay) * 100)}%` }}
            >
              <div
                className="h-full w-full rounded-t bg-accent"
                style={{ opacity: count ? 1 : 0 }}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Due forecast (next 7 days)">
        <div className="flex items-end gap-3">
          {stats.forecast.map((count, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-20 w-full items-end">
                <div
                  className="w-full rounded-t bg-accent"
                  style={{ height: `${Math.max(2, (count / maxForecast) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold">{count}</span>
              <span className="text-[11px] text-faint">
                {i === 0 ? 'Today' : `+${i}d`}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-card border border-border bg-panel p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-faint">{hint}</div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-border bg-panel p-5">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}
