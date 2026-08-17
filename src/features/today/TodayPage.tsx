import { useEffect, useState } from 'react'
import { SuggestedSessionHero } from './SuggestedSessionHero'
import { MomentumPanel } from './MomentumPanel'
import { ContinueLearningList } from './ContinueLearningList'
import { PaceChart } from './PaceChart'
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

// The '/' route, replacing the pre-Itera dashboard (which has since been
// deleted). Built from a reference mockup the product owner supplied; most
// content here is placeholder (no streak/momentum/pace/suggested-session data
// exists yet) — see the per-component comments and the decisions log for
// exactly what's real versus illustrative.
//
// Renders through the shared AppShell/TopNav (App Shell convergence milestone)
// rather than a private per-page shell — the page just returns its content,
// AppShell supplies IteraSurface/nav/width.
export function TodayPage() {
  const isWide = useIsWideToday()
  // Picked once per mount, not per render — see greetings.ts.
  const [message] = useState(() => pickDashboardMessage())

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-itera-ink-brand">
        {message.mainText}
      </h1>
      <p className="mt-1 text-itera-muted">{message.subtext}</p>

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
          <SuggestedSessionHero />
        </div>
        <div style={{ gridArea: 'momentum', marginTop: isWide ? '21px' : undefined }}>
          <MomentumPanel />
        </div>
        <div style={{ gridArea: 'continue' }}>
          <ContinueLearningList />
        </div>
        <div style={{ gridArea: 'pace' }}>
          <PaceChart />
        </div>
      </div>
    </div>
  )
}
