import { TodayShell } from './TodayShell'
import { SuggestedSessionHero } from './SuggestedSessionHero'
import { MomentumPanel } from './MomentumPanel'
import { ContinueLearningList } from './ContinueLearningList'
import { PaceChart } from './PaceChart'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

// Replaces DashboardPage.tsx as the '/' route (docs/itera-decisions.md,
// docs/itera-redesign-plan.md's "whole-app visual pass" aside). DashboardPage
// itself is untouched and still in the tree, unreferenced — reversible via
// router.tsx if needed. Built from a reference mockup the product owner
// supplied; most content here is placeholder (no streak/momentum/pace/
// suggested-session data exists yet) — see the per-component comments and
// the decisions log for exactly what's real versus illustrative.
export function TodayPage() {
  return (
    <TodayShell>
      <h1 className="font-itera-display text-3xl font-bold tracking-tight text-itera-ink-brand">
        {greeting()}
      </h1>
      <p className="mt-1 text-itera-muted">Build a little momentum today.</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SuggestedSessionHero />
          <ContinueLearningList />
        </div>
        <div className="space-y-5 lg:mt-[26px]">
          <MomentumPanel />
          <PaceChart />
        </div>
      </div>
    </TodayShell>
  )
}
