import { Outlet, useLocation } from 'react-router-dom'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { cn } from '@/lib/cn'
import { TopNav } from './TopNav'
import { AccountMenu } from './AccountMenu'
import { StreakBadge } from './StreakBadge'
import { primaryNavLinks } from './primaryNavLinks'

// The one shared shell for every standard product route (Today, Library,
// focused Deck, Roadmaps, Progress, Settings, Card create/edit/preview) — see
// docs/itera-decisions.md's App Shell convergence entry. Review is NOT a
// child of this route (router.tsx moves it to its own top-level, chrome-free
// entry, the same structural pattern Today/design-preview already used
// before this milestone) — there is no CSS-hiding involved.
//
// There is no theme toggle: the app is light-only (Itera has no dark palette
// yet) and ForceLightTheme pins this tree to light, so a toggle would be
// inert. ThemeProvider/useTheme survive only because CodeView/CodeEditor read
// the theme to choose their syntax palette.
export function AppShell() {
  const { pathname } = useLocation()
  const isCardPreview =
    pathname === '/preview' || /^\/cards\/[^/]+\/study$/.test(pathname)

  return (
    <IteraSurface className="min-h-screen">
      <TopNav
        navLinks={primaryNavLinks}
        rightSlot={
          <>
            <StreakBadge />
            <AccountMenu />
          </>
        }
      />
      <main
        className={cn(
          'w-full',
          isCardPreview
            ? 'py-0'
            : 'mx-auto max-w-[1280px] px-4 py-8 sm:px-6',
        )}
      >
        <Outlet />
      </main>
    </IteraSurface>
  )
}
