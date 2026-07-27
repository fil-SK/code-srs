import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Search } from 'lucide-react'
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
export function TopNav({
  navLinks,
  rightSlot,
  showSearch = true,
}: {
  navLinks: PrimaryNavLink[]
  rightSlot?: ReactNode
  showSearch?: boolean
}) {
  const badges = useNavBadges()

  return (
    <header className="border-b border-itera-border bg-itera-surface px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1280px] items-center gap-6 overflow-x-auto">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src="/itera-logo.png" alt="" className="h-[42px] w-[42px]" />
          <span className="font-itera-display text-lg font-bold tracking-tight text-itera-ink-brand">
            Itera
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-5">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors',
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

        <div className="flex-1" />

        {showSearch && (
          <div className="hidden shrink-0 items-center gap-2 rounded-itera-control border border-itera-border bg-itera-surface-subtle px-3 py-1.5 text-sm text-itera-muted sm:flex">
            <Search size={15} />
            <span>Search</span>
          </div>
        )}

        {rightSlot}
      </div>
    </header>
  )
}
