import { Link, useLocation } from 'react-router-dom'
import {
  ArrowUpDown,
  CircleQuestionMark,
  Gift,
  GraduationCap,
  Info,
  Keyboard,
  LogOut,
  SlidersHorizontal,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { cn } from '@/lib/cn'

// The account menu's body, shared verbatim by the anchored popover and the
// narrow-viewport bottom sheet (AccountMenu.tsx) so there is exactly one
// definition of what the menu contains.
//
// Deliberately a *quick navigation* menu, not a second settings sidebar. It
// carries only the profile-menu reference's requested shortcuts; the full set
// of settings sections still lives inside the Account settings page.
//
// Sign out is live whenever any session is (local, demo, or Supabase) — it is
// the exit half of the /login loop. Account settings, FSRS/Card scheduling and
// Import / Export are real routes. Rows without a backing page remain marked
// "Soon" and focusable (aria-disabled, not `disabled`) so keyboard users hear
// their state instead of skipping visible content.

interface MenuRow {
  label: string
  icon: LucideIcon
  /** Live rows navigate; every other row is a disabled placeholder. */
  to?: string
  onSelect?: () => void
  accent?: boolean
}

function MenuItem({ row, onNavigate }: { row: MenuRow; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const { label, icon: Icon, to, onSelect, accent } = row
  const disabled = !to && !onSelect
  const active =
    to !== undefined &&
    (to === '/settings' ? pathname === to : pathname === to || pathname.startsWith(`${to}/`))

  const shared = 'flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-itera-control'
  const tone = disabled
    ? 'text-itera-muted-light cursor-default'
    : accent
      ? 'font-medium text-itera-accent hover:bg-itera-accent-soft'
      : cn(
          'text-itera-ink hover:bg-itera-surface-subtle hover:text-itera-ink-brand',
          active && 'bg-itera-accent-soft font-semibold text-itera-ink-brand',
        )

  const body = (
    <>
      <Icon
        size={17}
        aria-hidden="true"
        className={cn(
          'flex-none',
          disabled
            ? 'text-itera-muted-light'
            : accent
              ? 'text-itera-accent'
              : active
                ? 'text-itera-accent'
                : 'text-itera-navy',
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {disabled && (
        <span className="flex-none rounded-itera-pill bg-itera-navy-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-itera-muted">
          Soon
        </span>
      )}
    </>
  )

  if (disabled) {
    return (
      <button
        type="button"
        role="menuitem"
        aria-disabled="true"
        // Not the `disabled` attribute: that drops the row out of the focus
        // order entirely, so a keyboard user would never learn the row exists.
        onClick={(e) => e.preventDefault()}
        className={cn(shared, tone)}
      >
        {body}
      </button>
    )
  }

  if (to) {
    return (
      <Link to={to} role="menuitem" onClick={onNavigate} className={cn(shared, tone)}>
        {body}
      </Link>
    )
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onNavigate()
        onSelect?.()
      }}
      className={cn(shared, tone)}
    >
      {body}
    </button>
  )
}

function Divider() {
  return <div role="separator" className="my-1.5 border-t border-itera-border" />
}

export function AccountMenuContent({ onNavigate }: { onNavigate: () => void }) {
  const { identity, isAuthenticated, signOut } = useAuth()

  // Whatever session is live (Supabase or local) supplies the email. There is
  // still no display name anywhere in the product, so that line stays a greyed
  // placeholder rather than inventing one.
  const displayEmail = identity?.email
  const initial = displayEmail?.[0]?.toUpperCase()

  const groups: MenuRow[][] = [
    [
      { label: 'Account settings', icon: User, to: '/settings' },
      { label: 'Preferences', icon: SlidersHorizontal },
    ],
    [
      { label: 'Study settings', icon: GraduationCap },
      {
        label: 'Spaced repetition (FSRS)',
        icon: TrendingUp,
        to: '/settings/card-scheduling',
      },
      { label: 'Import / Export', icon: ArrowUpDown, to: '/settings/import-export' },
    ],
    [
      { label: 'Keyboard shortcuts', icon: Keyboard },
      { label: 'Help & documentation', icon: CircleQuestionMark },
    ],
    [
      { label: "What's new", icon: Gift },
      { label: 'About Itera', icon: Info },
    ],
    [
      {
        label: 'Sign out',
        icon: LogOut,
        accent: true,
        onSelect: isAuthenticated ? () => void signOut() : undefined,
      },
    ],
  ]

  return (
    <div className="p-1.5">
      <div className="flex items-center gap-3 px-2 pb-2 pt-1.5">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 flex-none place-items-center rounded-full bg-itera-navy text-lg font-semibold text-white"
        >
          {initial ?? <User size={20} />}
        </span>
        <div className="min-w-0">
          <div
            className={cn(
              'truncate text-[15px] font-semibold',
              displayEmail ? 'text-itera-ink-brand' : 'text-itera-muted-light',
            )}
          >
            Your name
          </div>
          <div
            className={cn(
              'truncate text-[13px]',
              displayEmail ? 'text-itera-muted' : 'text-itera-muted-light',
            )}
          >
            {displayEmail ?? 'Not signed in'}
          </div>
        </div>
      </div>

      {groups.map((rows, i) => (
        // Index keys are stable here: `groups` is a fixed literal, never
        // reordered or filtered.
        <div key={i}>
          <Divider />
          {rows.map((row) => (
            <MenuItem key={row.label} row={row} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </div>
  )
}
