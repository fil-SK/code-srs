import { Outlet, useLocation } from 'react-router-dom'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { cn } from '@/lib/cn'
import { TopNav } from './TopNav'
import { AccountMenu } from './AccountMenu'
import { StreakBadge } from './StreakBadge'
import { primaryNavLinks } from './primaryNavLinks'

// The one shared shell for every standard product route (Today, Library,
// focused Deck, Browse, Drafts, Stats, Settings, Card create/edit) — see
// docs/itera-decisions.md's App Shell convergence entry. Review is NOT a
// child of this route (router.tsx moves it to its own top-level, chrome-free
// entry, the same structural pattern Today/design-preview already used
// before this milestone) — there is no CSS-hiding involved.
//
// ThemeToggle is intentionally not rendered here: the app is light-only for
// now (Itera has no dark palette yet), so the toggle would be inert under
// ForceLightTheme. Not deleted — see ThemeToggle.tsx.
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
