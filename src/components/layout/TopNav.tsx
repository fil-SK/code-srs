import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useNavBadges } from './useNavBadges'
import type { PrimaryNavLink } from './primaryNavLinks'

// The one shared top-nav chrome for the whole app (replaces the old
// sidebar+bottombar AppShell, and folds in what were three independent
// near-duplicate copies of this same JSX: TodayShell, design-preview's
// LibraryTopNav, and PreviewShell's banner header). overflow-x-auto +
// shrink-0 on every child is a real narrow-viewport fix (not decoration):
// without shrink-0, flex's default shrink:1 let the logo block compress
// below its own content's width, which then visually overflowed into the
// nav's box instead of the row just scrolling.
//
// No global Search or Create action here (product call: both are scoped
// concepts - search within a Library, create a card within a deck - and
// belong on the Library page, not floating in the shell with no context).
export function TopNav({
  navLinks,
  rightSlot,
}: {
  navLinks: PrimaryNavLink[]
  rightSlot?: ReactNode
}) {
  const badges = useNavBadges()

  return (
    <header className="border-b border-itera-border bg-itera-canvas px-4 sm:px-6">
      <div className="mx-auto flex h-16 max-w-[1280px] items-stretch gap-8 overflow-x-auto">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/itera-logo.png" alt="" className="h-10 w-10" />
          <span className="text-2xl font-[650] tracking-[-0.025em] text-itera-ink-brand">
            Itera
          </span>
        </Link>

        <nav className="flex flex-1 shrink-0 items-stretch justify-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 whitespace-nowrap border-b-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-itera-accent text-itera-ink-brand'
                    : 'border-transparent text-itera-muted hover:text-itera-ink',
                )
              }
            >
              {link.label}
              {badges[link.to] ? (
                <span className="rounded-itera-pill bg-itera-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {badges[link.to]}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-4">{rightSlot}</div>
      </div>
    </header>
  )
}
