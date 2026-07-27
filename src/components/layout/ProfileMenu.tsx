import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { isSupabaseConfigured } from '@/data/supabase/client'

// Global Profile action (locked IA: "Settings belongs under Profile"). Local
// mode (no Supabase) has no session, so the menu is just a way to reach
// Settings; the sign-out row only appears once a session exists — same guard
// SettingsPage's own Account section already uses.
export function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { email, signOut } = useAuth()

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const initial = email?.[0]?.toUpperCase() ?? '?'

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile"
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full bg-itera-navy-soft font-semibold text-itera-ink-brand"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-48 rounded-itera-control border border-itera-border bg-itera-surface py-1 shadow-[var(--itera-shadow-float)]"
        >
          {isSupabaseConfigured && email && (
            <div className="truncate px-3 py-1.5 text-xs text-itera-muted">{email}</div>
          )}
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-itera-ink hover:bg-itera-surface-subtle"
          >
            <Settings size={14} />
            Settings
          </Link>
          {isSupabaseConfigured && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-itera-error hover:bg-itera-error-soft"
            >
              <LogOut size={14} />
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  )
}
