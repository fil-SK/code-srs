import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { ChevronDown, User } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { FloatingPanel } from '@/components/ui/FloatingPanel'
import { AccountMenuContent } from './AccountMenuContent'
import { useIsNarrowShell } from './useIsNarrowShell'

const PANEL_CLASS = 'w-[300px] max-w-[calc(100vw-16px)] rounded-itera-dialog py-0'

// The global account menu: the avatar in the top-right of the shared top nav
// opens a compact floating popover anchored to it. Mounted once, from
// AppShell, so it is the same component on Today, Library, Progress and every
// other standard route — and, since Review is a separate top-level route with
// no AppShell ancestor, it is absent there by construction (locked IA:
// Review removes global navigation).
//
// The panel is portaled and `fixed` (FloatingPanel), so opening it cannot
// shift or resize the page underneath, and it escapes the stacking/overflow
// contexts an `absolute` child would be trapped by — the same reasoning that
// produced FloatingPanel for the Library row menus.
export function AccountMenu() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { identity } = useAuth()
  const isNarrow = useIsNarrowShell()
  const location = useLocation()

  // Any route change closes the menu, including ones it did not initiate
  // (browser back/forward, a nav link elsewhere in the shell).
  useEffect(() => setOpen(false), [location.key])

  const initial = identity?.email[0]?.toUpperCase()

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-itera-pill p-1 hover:bg-itera-surface-subtle"
      >
        <span
          aria-hidden="true"
          className="grid h-9 w-9 flex-none place-items-center rounded-full bg-itera-navy text-sm font-semibold text-white"
        >
          {initial ?? <User size={17} />}
        </span>
        <Chevron open={open} />
      </button>

      {open && !isNarrow && (
        <FloatingPanel
          anchor={buttonRef.current}
          onClose={() => setOpen(false)}
          role="menu"
          ariaLabel="Account"
          className={PANEL_CLASS}
          manageFocus
          returnFocusTo={buttonRef.current}
        >
          <AccountMenuContent onNavigate={() => setOpen(false)} />
        </FloatingPanel>
      )}

      {open && isNarrow && (
        <AccountMenuSheet onClose={() => setOpen(false)} returnFocusTo={buttonRef.current} />
      )}
    </div>
  )
}

// Rotation is computed as one literal transform string rather than a Tailwind
// `rotate-*` utility: those write separate custom properties that a shared
// rule composes, and transitioning that composed value does not animate
// reliably (see CLAUDE.md).
function Chevron({ open }: { open: boolean }) {
  const reduced = usePrefersReducedMotion()
  return (
    <ChevronDown
      size={16}
      aria-hidden="true"
      className="flex-none text-itera-muted"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: reduced ? undefined : 'transform 150ms ease',
      }}
    />
  )
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// Below 480px the same menu content becomes a bottom sheet — an anchored
// 300px popover there would span nearly the full width anyway, hugging both
// edges. It is dismissed by exactly the same rules as the popover (scrim
// click, Escape, selecting an item, route change); it is not a persistent
// mobile sidebar. Structure follows CollectionNavDrawer, turned to the bottom
// edge.
function AccountMenuSheet({
  onClose,
  returnFocusTo,
}: {
  onClose: () => void
  returnFocusTo: HTMLElement | null
}) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const returnFocusRef = useRef(returnFocusTo)
  returnFocusRef.current = returnFocusTo

  useEffect(() => {
    const sheet = sheetRef.current
    sheet?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus()
    return () => {
      const active = document.activeElement
      if (active && active !== document.body && !sheet?.contains(active)) return
      returnFocusRef.current?.focus()
    }
  }, [])

  return createPortal(
    // document.body sits outside `.itera-scope`, so the portal re-establishes
    // the token scope and cancels the canvas background the class paints.
    <div
      className="itera-scope"
      style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 60 }}
    >
      <div className="absolute inset-0 bg-[rgba(23,32,51,0.35)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        role="menu"
        aria-label="Account"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-itera-dialog border-t border-itera-border bg-itera-surface pb-3 shadow-[var(--itera-shadow-float)]"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2 mb-1 h-1 w-9 rounded-itera-pill bg-itera-border-strong"
        />
        <AccountMenuContent onNavigate={onClose} />
      </div>
    </div>,
    document.body,
  )
}
