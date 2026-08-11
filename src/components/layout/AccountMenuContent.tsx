import { Link, useLocation } from 'react-router-dom'
import {
  CircleQuestionMark,
  Info,
  Keyboard,
  LogOut,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { isSupabaseConfigured } from '@/data/supabase/client'
import { cn } from '@/lib/cn'

// The account menu's body, shared verbatim by the anchored popover and the
// narrow-viewport bottom sheet (AccountMenu.tsx) so there is exactly one
// definition of what the menu contains.
//
// Deliberately a *quick navigation* menu, not a second settings sidebar: the
// full set of settings sections (study settings, FSRS, import/export,
// appearance, privacy, notifications, devices) lives inside the Account
// settings page, reachable from the first row here.
//
// Everything except Account settings renders disabled, because none of it
// exists yet — the rows are here to state the intended IA, and each one is
// marked "Soon" so the greying is explicit rather than something the user has
// to infer from a color. They stay focusable (aria-disabled, not `disabled`)
// so keyboard users reach them and hear the state instead of skipping past a
// row they can see.

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
  const active = to !== undefined && (pathname === to || pathname.startsWith(`${to}/`))

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
  const { email, session, signOut } = useAuth()
  const signedIn = isSupabaseConfigured && session !== null

  // Local mode (no Supabase) has no account at all, so there is no name or
  // email to show — a greyed placeholder identity, consistent with the rest of
  // the menu, rather than inventing one. A real session fills the email in.
  const displayEmail = signedIn ? email : undefined
  const initial = displayEmail?.[0]?.toUpperCase()

  const groups: MenuRow[][] = [
    [
      { label: 'Account settings', icon: User, to: '/settings' },
      { label: 'Preferences', icon: SlidersHorizontal },
    ],
    [
      { label: 'Keyboard shortcuts', icon: Keyboard },
      { label: 'Help & documentation', icon: CircleQuestionMark },
    ],
    [{ label: 'About Itera', icon: Info }],
    [
      {
        label: 'Sign out',
        icon: LogOut,
        accent: true,
        onSelect: signedIn ? () => void signOut() : undefined,
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
