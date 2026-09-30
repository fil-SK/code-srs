import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useNavBadges } from './useNavBadges'
import type { PrimaryNavLink } from './primaryNavLinks'

// The one shared top-nav chrome for the whole app. It replaced the old
// sidebar+bottombar AppShell and absorbed what were three independent
// near-duplicate copies of this same JSX, all since deleted.
// overflow-x-auto +
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
    <header className="border-b border-fliptap-border bg-fliptap-surface px-4 sm:px-6">
      <div className="mx-auto flex h-16 max-w-[1280px] items-stretch gap-8 overflow-x-auto">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/fliptap-logo.png" alt="" className="h-10 w-10" />
          <span className="text-2xl font-[650] tracking-[-0.025em] text-fliptap-ink-brand">
            FlipTap
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
                    ? 'border-fliptap-accent text-fliptap-ink-brand'
                    : 'border-transparent text-fliptap-muted hover:text-fliptap-ink',
                )
              }
            >
              {link.label}
              {badges[link.to] ? (
                <span className="rounded-fliptap-pill bg-fliptap-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
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
