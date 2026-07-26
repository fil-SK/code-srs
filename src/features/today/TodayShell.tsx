import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'
import { cn } from '@/lib/cn'

// Today's own top-nav chrome (spec §11.1) — deliberately NOT AppShell's left
// sidebar. Per docs/itera-decisions.md, this is scoped to Today only for
// now: every other route still renders inside AppShell until its own turn.
// Two nav styles coexisting is a known, accepted tradeoff of doing this
// incrementally rather than a whole-app shell swap.
//
// Library/Progress link to today's real routes (/decks, /stats) under their
// target names — those pages haven't been visually rebuilt yet, but the
// links are real navigation, not dead ends. Roadmaps is deliberately absent
// (docs/itera-decisions.md D17, reaffirmed when this page was built).
const NAV_LINKS = [
  { to: '/', label: 'Today', end: true },
  { to: '/decks', label: 'Library', end: false },
  { to: '/stats', label: 'Progress', end: false },
]

export function TodayShell({ children }: { children: ReactNode }) {
  return (
    <IteraSurface className="min-h-screen">
      <header className="border-b border-itera-border bg-itera-surface px-4 py-3 sm:px-6">
        {/* overflow-x-auto + shrink-0 on every child is the fix for a real
            narrow-viewport bug: without shrink-0, flex's default shrink:1
            let the logo block compress below its own content's width (img +
            "Itera" text), which then visually overflowed into nav's box
            instead of the row just scrolling. shrink-0 everywhere + auto
            overflow on the row means content never overlaps — it scrolls. */}
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 overflow-x-auto">
          <div className="flex shrink-0 items-center gap-2">
            <img src="/itera-logo.png" alt="" className="h-[42px] w-[42px]" />
            <span className="font-itera-display text-lg font-bold tracking-tight text-itera-ink-brand">
              Itera
            </span>
          </div>

          <nav className="flex shrink-0 items-center gap-5">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap border-b-2 py-1 text-sm font-semibold transition-colors',
                    isActive
                      ? 'border-itera-accent text-itera-ink-brand'
                      : 'border-transparent text-itera-muted hover:text-itera-ink',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

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

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">{children}</main>
    </IteraSurface>
  )
}
