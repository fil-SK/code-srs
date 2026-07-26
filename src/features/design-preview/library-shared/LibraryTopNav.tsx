import { Link } from 'react-router-dom'
import { Flame, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/cn'

// Preview-local duplication of TodayShell.tsx's nav JSX — not an import of
// (or edit to) the real file, per the isolation scope. "Library" is
// hardcoded active since NavLink's route-matching won't fire under
// /design-preview/*. Adds one static illustrative element beyond what
// TodayShell has today: a streak indicator, same placeholder-data spirit as
// MomentumPanel.tsx's "7-day streak" row — no real streak tracking exists.
const NAV_LINKS: { label: string; to?: string }[] = [
  { label: 'Today', to: '/' },
  { label: 'Library' }, // current page — no link needed
  { label: 'Progress', to: '/stats' },
]

export function LibraryTopNav() {
  return (
    <header className="border-b border-itera-border bg-itera-surface px-4 py-3 sm:px-6">
      {/* overflow-x-auto + shrink-0 on every child: without shrink-0, flex's
          default shrink:1 let the logo block compress below its own content's
          width (img + "Itera" text), which then visually overflowed into
          nav's box instead of the row just scrolling. Mirrors the same fix
          in the real TodayShell.tsx. */}
      <div className="mx-auto flex max-w-[1280px] items-center gap-6 overflow-x-auto">
        <div className="flex shrink-0 items-center gap-2">
          <img src="/itera-logo.png" alt="" className="h-[42px] w-[42px]" />
          <span className="font-itera-display text-lg font-bold tracking-tight text-itera-ink-brand">
            Itera
          </span>
        </div>

        <nav className="flex shrink-0 items-center gap-5">
          {NAV_LINKS.map((link) =>
            link.to ? (
              <Link
                key={link.label}
                to={link.to}
                className="whitespace-nowrap border-b-2 border-transparent py-1 text-sm font-semibold text-itera-muted transition-colors hover:text-itera-ink"
              >
                {link.label}
              </Link>
            ) : (
              <span
                key={link.label}
                className="whitespace-nowrap border-b-2 border-itera-accent py-1 text-sm font-semibold text-itera-ink-brand"
              >
                {link.label}
              </span>
            ),
          )}
        </nav>

        <div className="flex-1" />

        <div
          className={cn(
            'hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-itera-accent sm:flex',
          )}
        >
          <Flame size={15} />
          12 day streak
        </div>

        <div className="hidden shrink-0 items-center gap-2 rounded-itera-control border border-itera-border bg-itera-surface-subtle px-3 py-1.5 text-sm text-itera-muted sm:flex">
          <Search size={15} />
          <span>Search</span>
        </div>

        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:brightness-105"
        >
          <Plus size={15} />
          Create
        </button>

        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-itera-navy-soft font-semibold text-itera-ink-brand">
          ?
        </div>
      </div>
    </header>
  )
}
