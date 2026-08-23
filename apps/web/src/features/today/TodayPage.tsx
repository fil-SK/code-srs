import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/features/library/shared/EmptyState'
import { buildRange } from '@/domain/stats/dateRange'
import { computeDeckMetrics } from '@/domain/stats/deckMetrics'
import { computeRetention } from '@/domain/stats/progressMetrics'
import { computeStreak } from '@/domain/stats/streak'
import {
  buildContinueLearning,
  computePaceSeries,
  estimateSessionMinutes,
  nextDueAt,
  selectNextMilestone,
  summarizeDueQueue,
} from '@/domain/stats/todayMetrics'
import { useDueCards, useSearchCards } from '@/hooks/useCards'
import { useDecks } from '@/hooks/useDecks'
import { useReviewLogs } from '@/hooks/useReview'
import { SuggestedSessionHero } from './SuggestedSessionHero'
import { MomentumPanel } from './MomentumPanel'
import { ContinueLearningList } from './ContinueLearningList'
import { PaceChart } from './PaceChart'
import { AdjustSessionDialog } from './AdjustSessionDialog'
import { pickDashboardMessage } from './greetings'

// True 2-col/2-row CSS grid with named areas ("hero momentum" / "continue
// pace"), not two independent flex columns — that's what makes Continue
// Learning and Today's Pace land on the same row-start line automatically
// (grid row 2 sizes to its own content and both cells top-align to it),
// instead of Today's Pace trailing directly under Momentum. Below ~980px
// it collapses to one column, in reading order (Hero, Momentum, Continue
// Learning, Today's Pace) — done with a matchMedia hook rather than
// Tailwind breakpoints because grid-template-areas has no Tailwind utility
// and the requested breakpoint (980px) doesn't line up with a default one.
function useIsWideToday(): boolean {
  const query = '(min-width: 980px)'
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setIsWide(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isWide
}

// The '/' route. Every learning value on this page is real as of Milestone 2 —
// the illustrative constants each panel used to carry are gone. This component
// is the only place Today fetches: the four panels are presentational and take
// already-computed props, and every calculation behind those props is a pure
// function in src/domain/stats (todayMetrics, streak, deckMetrics,
// progressMetrics), so none of it is trapped inside a component.
//
// Renders through the shared AppShell/TopNav rather than a private per-page
// shell — the page just returns its content, AppShell supplies
// IteraSurface/nav/width.
export function TodayPage() {
  const isWide = useIsWideToday()
  // Picked once per mount, not per render — see greetings.ts.
  const [message] = useState(() => pickDashboardMessage())
  const [adjusting, setAdjusting] = useState(false)
  const adjustTriggerRef = useRef<HTMLElement | null>(null)

  // Snapshot "now" once per mount so the due query key is stable, matching
  // ReviewPage — Today and /review must agree on what "due" means.
  const now = useMemo(() => Date.now(), [])
  const allCards = useSearchCards({ includeSuspended: true })
  const dueCards = useDueCards({ now })
  const decks = useDecks()
  const logs = useReviewLogs()

  // The query results themselves are the memo dependencies (a `?? []` at this
  // level would allocate a new array every render and invalidate everything) —
  // same shape ProgressPage uses.
  const cardData = allCards.data
  const dueData = dueCards.data
  const deckData = decks.data
  const logData = logs.data

  const metrics = useMemo(
    () => computeDeckMetrics(cardData ?? [], dueData ?? []),
    [cardData, dueData],
  )
  const queue = useMemo(() => summarizeDueQueue(dueData ?? [], deckData ?? []), [dueData, deckData])
  const estimatedMinutes = useMemo(
    () => estimateSessionMinutes(logData ?? [], queue.dueCount),
    [logData, queue.dueCount],
  )
  const streak = useMemo(() => computeStreak(logData ?? [], now), [logData, now])
  const retention = useMemo(() => {
    const range = buildRange('30d', now)
    return computeRetention(
      (logData ?? []).filter((l) => l.reviewedAt >= range.from && l.reviewedAt < range.to),
    )
  }, [logData, now])
  const milestone = useMemo(
    () => selectNextMilestone(deckData ?? [], cardData ?? [], logData ?? [], metrics),
    [deckData, cardData, logData, metrics],
  )
  const continueRows = useMemo(
    () => buildContinueLearning(deckData ?? [], metrics),
    [deckData, metrics],
  )
  const paceDays = useMemo(() => computePaceSeries(logData ?? [], now), [logData, now])
  const nextDue = useMemo(() => nextDueAt(cardData ?? [], now), [cardData, now])

  const loading = allCards.isLoading || dueCards.isLoading || decks.isLoading || logs.isLoading
  const emptyWorkspace = !deckData?.length && !cardData?.length

  const greeting = (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-itera-ink-brand">
        {message.mainText}
      </h1>
      <p className="mt-1 text-itera-muted">{message.subtext}</p>
    </>
  )

  // Nothing is rendered against half-loaded data. An empty `dueCards` result
  // is indistinguishable from "not fetched yet" at the panel level, so a grid
  // painted during the first tick would claim "All caught up" and a zero
  // streak to every user on every visit, then correct itself.
  if (loading) {
    return (
      <div>
        {greeting}
        <p className="mt-6 text-sm text-itera-muted">Loading…</p>
      </div>
    )
  }

  // A brand-new workspace has nothing true to put in four panels — zeros and
  // em dashes everywhere would be noise, not information — so Today becomes
  // one intentional empty state pointing at the two real ways to get started.
  // Card creation requires a deck, so there is no global new-card link here.
  if (emptyWorkspace) {
    return (
      <div>
        {greeting}
        <div className="mt-6">
          <EmptyState
            title="No decks yet"
            description="Create your first deck to start learning, or import an existing Itera backup."
            action={
              <div className="flex flex-wrap justify-center gap-2.5">
                <Link to="/decks">
                  <Button variant="primary">Create a deck</Button>
                </Link>
                <Link to="/settings/import-export">
                  <Button>Import</Button>
                </Link>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      {greeting}

      <div
        className="mt-6"
        style={
          isWide
            ? {
                display: 'grid',
                gridTemplateColumns: 'minmax(720px, 1fr) 430px',
                gridTemplateAreas: '"hero momentum" "continue pace"',
                columnGap: '40px',
                rowGap: '16px',
                alignItems: 'start',
              }
            : {
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridTemplateAreas: '"hero" "momentum" "continue" "pace"',
                rowGap: '20px',
              }
        }
      >
        <div style={{ gridArea: 'hero' }}>
          <SuggestedSessionHero
            cardCount={queue.dueCount}
            estimatedMinutes={estimatedMinutes}
            deckNames={queue.deckNames}
            extraDeckCount={queue.extraDeckCount}
            nextDue={nextDue}
            onAdjust={() => {
              adjustTriggerRef.current = document.activeElement as HTMLElement | null
              setAdjusting(true)
            }}
          />
        </div>
        <div style={{ gridArea: 'momentum', marginTop: isWide ? '21px' : undefined }}>
          <MomentumPanel
            streak={streak.current}
            retention={retention}
            dueCount={queue.dueCount}
            milestone={milestone}
          />
        </div>
        <div style={{ gridArea: 'continue' }}>
          <ContinueLearningList rows={continueRows} />
        </div>
        <div style={{ gridArea: 'pace' }}>
          <PaceChart days={paceDays} />
        </div>
      </div>

      {adjusting && (
        <AdjustSessionDialog
          decks={deckData ?? []}
          dueCards={dueData ?? []}
          onClose={() => setAdjusting(false)}
          returnFocusTo={adjustTriggerRef.current}
        />
      )}
    </div>
  )
}
