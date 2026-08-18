import { NavLink, Link } from 'react-router-dom'
import {
  ChartNoAxesColumn,
  ChartNoAxesCombined,
  ClipboardList,
  Flag,
  History,
  ScanSearch,
  Server,
  Settings,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface NavItem {
  label: string
  icon: LucideIcon
  to?: string // present only for the one live destination (Overview)
}

interface NavGroup {
  heading: string
  items: NavItem[]
}

// Mirrors the locked mockup's full sidebar IA (see docs/itera-decisions.md).
// Only "Overview" has real data behind it today — the rest render as
// visibly disabled rows with a "Soon" pill rather than being omitted, so the
// sidebar's composition/hierarchy matches the reference without fabricating
// pages that have no data source yet.
const NAV_GROUPS: NavGroup[] = [
  { heading: 'Overview', items: [{ label: 'Overview', icon: TrendingUp, to: '/progress' }] },
  {
    heading: 'Learning',
    items: [
      { label: 'Decks', icon: Server },
      // "Review history" is the chronological per-review record. "Activity"
      // stays a placeholder on purpose: it reads as a broader feed (cards
      // created, decks edited, imports), so the name is left free for it.
      { label: 'Review history', icon: History, to: '/progress/history' },
      { label: 'Activity', icon: ChartNoAxesCombined },
      { label: 'Review lag', icon: ScanSearch },
    ],
  },
  {
    heading: 'Achievements',
    items: [
      { label: 'Milestones', icon: Flag },
      { label: 'Achievements', icon: Trophy },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { label: 'Stats', icon: ChartNoAxesColumn },
      { label: 'Reports', icon: ClipboardList },
    ],
  },
]

export function ProgressNav() {
  return (
    <div className="flex h-full flex-col p-4">
      <nav aria-label="Progress" className="space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className="mb-1 px-2.5 text-xs font-bold uppercase tracking-wider text-itera-muted">
              {group.heading}
            </div>
            <div>
              {group.items.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-r-[9px] border-l-2 px-2.5 py-2 text-sm font-semibold',
                        isActive
                          ? 'border-itera-accent bg-itera-accent-soft text-itera-ink-brand'
                          : 'border-transparent text-itera-ink hover:bg-itera-surface-subtle hover:text-itera-ink-brand',
                      )
                    }
                  >
                    <item.icon size={17} strokeWidth={2} className="text-itera-accent" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                ) : (
                  <div
                    key={item.label}
                    aria-disabled="true"
                    className="flex items-center justify-between gap-2 rounded-r-[9px] border-l-2 border-transparent px-2.5 py-2 text-sm font-medium text-itera-muted-light"
                  >
                    <span className="flex items-center gap-2">
                      <item.icon size={17} strokeWidth={1.9} aria-hidden="true" />
                      {item.label}
                    </span>
                    <span className="rounded-itera-pill bg-itera-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-itera-muted-light">
                      Soon
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>

      <Link
        to="/settings"
        className="mt-auto flex items-center gap-2 rounded-itera-control px-2 py-1.5 pt-6 text-left text-sm font-semibold text-itera-muted hover:text-itera-ink-brand"
      >
        <Settings size={15} />
        Settings
      </Link>
    </div>
  )
}
