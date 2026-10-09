import { useMemo } from 'react'
import { computeAchievements, useReviewLogs } from '@fliptap/core'
import { Button } from '@/components/ui/Button'
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton'
import { ProgressShell } from './ProgressShell'
import { Achievements } from './components/Achievements'
import './progress.css'

export function AchievementsPage() {
  const now = useMemo(() => Date.now(), [])
  const logsQuery = useReviewLogs()
  const achievements = useMemo(() => computeAchievements(logsQuery.data ?? [], now), [logsQuery.data, now])

  return (
    <ProgressShell>
      <div className="achievements-view space-y-5">
        <header>
          <h1 className="font-fliptap-display text-[34px] font-bold leading-tight tracking-tight text-fliptap-ink-brand">Achievements</h1>
          <p className="mt-1 text-sm text-fliptap-muted">A collection of milestones along your learning journey.</p>
        </header>
        {logsQuery.isLoading ? (
          <LoadingRegion label="Loading your achievements" className="space-y-4">
            <Skeleton className="h-44 rounded-fliptap-card" />
            <Skeleton className="h-44 rounded-fliptap-card" />
            <div className="achievement-grid"><Skeleton className="h-40 rounded-fliptap-card" /><Skeleton className="h-40 rounded-fliptap-card" /></div>
          </LoadingRegion>
        ) : logsQuery.isError ? (
          <div role="alert" className="progress-panel p-6">
            <p className="text-sm text-fliptap-ink-brand">Your study history couldn't be loaded. Try again to see your achievements.</p>
            <Button className="mt-3" onClick={() => void logsQuery.refetch()}>Try again</Button>
          </div>
        ) : <Achievements achievements={achievements} />}
      </div>
    </ProgressShell>
  )
}