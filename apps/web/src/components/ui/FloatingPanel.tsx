import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'

const GAP = 4 // distance between the anchor and the panel
const EDGE = 8 // minimum distance the panel keeps from the viewport edge

// A popover/menu panel anchored to a trigger element, rendered through a
// portal at fixed coordinates.
//
// Why not a plain `absolute` child of the trigger (what every menu here used
// to be): the Library card/deck tables live inside an `overflow-x-auto`
// wrapper, and a box with `overflow-x: auto` also computes `overflow-y: auto`
// — so an absolutely positioned menu on one of the lower rows was clipped by
// that box and turned it into a scroller instead of simply opening. Rows also
// use `opacity` (suspended) and drag transforms, both of which create
// stacking contexts that a z-index inside the row can't escape. Portaling out
// sidesteps all of it, and lets the panel flip above its anchor when there
// isn't room below.
const ITEM_SELECTOR = '[role="menuitem"]'

export function FloatingPanel({
  anchor,
  onClose,
  children,
  align = 'end',
  className,
  role,
  ariaLabel,
  manageFocus = false,
  returnFocusTo,
}: {
  anchor: HTMLElement | null
  onClose: () => void
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
  role?: string
  ariaLabel?: string
  /**
   * Opt in to real menu keyboard semantics: focus moves into the panel on
   * open, Arrow/Home/End walk the `role="menuitem"` children, Tab closes.
   * Off by default so the row kebab menus (which are pointer-driven and were
   * shipped without it) keep behaving exactly as they did.
   */
  manageFocus?: boolean
  /** Where focus goes when the panel unmounts. Usually the trigger. */
  returnFocusTo?: HTMLElement | null
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!anchor || !panel) return

    function place() {
      if (!anchor || !panel) return
      const a = anchor.getBoundingClientRect()
      const p = panel.getBoundingClientRect()
      const vh = window.innerHeight
      const vw = window.innerWidth

      const below = a.bottom + GAP
      const above = a.top - GAP - p.height
      // Open downwards by default; flip up only when the panel genuinely
      // doesn't fit below and does fit above. When it fits neither way, sit
      // it against the bottom edge rather than running off the screen.
      const fitsBelow = below + p.height + EDGE <= vh
      const top = fitsBelow ? below : above >= EDGE ? above : Math.max(EDGE, vh - p.height - EDGE)

      const rawLeft = align === 'end' ? a.right - p.width : a.left
      const left = Math.min(Math.max(EDGE, rawLeft), Math.max(EDGE, vw - p.width - EDGE))

      setPos({ top, left })
    }

    place()
    // `true` so scrolling any ancestor (the table's own overflow box, the
    // page) keeps the panel attached to its trigger rather than detaching.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [anchor, align])

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchor?.contains(target)) return
      onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [anchor, onClose])

  // Read through a ref so a changing `returnFocusTo` (the trigger's ref is
  // null on the very first render) never re-runs the effect and re-steals
  // focus mid-interaction.
  const returnFocusRef = useRef(returnFocusTo)
  returnFocusRef.current = returnFocusTo

  // Gated on `pos`, not just mount: until the panel has been measured it is
  // still `visibility: hidden`, and focus() on a hidden element is a silent
  // no-op — the menu would open with focus stranded on the trigger.
  const placed = pos !== null
  const focusedIn = useRef(false)

  useEffect(() => {
    if (!manageFocus || !placed || focusedIn.current) return
    focusedIn.current = true
    const panel = panelRef.current
    const enabled = panel?.querySelector<HTMLElement>(
      `${ITEM_SELECTOR}:not([aria-disabled="true"])`,
    )
    ;(enabled ?? panel?.querySelector<HTMLElement>(ITEM_SELECTOR) ?? panel)?.focus()
  }, [manageFocus, placed])

  useEffect(() => {
    if (!manageFocus) return
    const panel = panelRef.current
    return () => {
      // Only pull focus back when it is still ours to move. Clicking straight
      // into another control should leave focus where the user put it.
      const active = document.activeElement
      if (active && active !== document.body && !panel?.contains(active)) return
      returnFocusRef.current?.focus()
    }
  }, [manageFocus])

  function onPanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const panel = panelRef.current
    if (!manageFocus || !panel) return
    if (e.key === 'Tab') {
      e.preventDefault()
      onClose()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const items = Array.from(panel.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
    if (items.length === 0) return
    e.preventDefault()
    const current = items.indexOf(document.activeElement as HTMLElement)
    const last = items.length - 1
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? last
          : e.key === 'ArrowDown'
            ? current < 0
              ? 0
              : (current + 1) % items.length
            : current < 0
              ? last
              : (current - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return createPortal(
    // document.body sits outside `.itera-scope`, so the portal has to
    // re-establish the token scope itself. The class also paints a canvas
    // background, which a transparent overlay must not — hence the inline
    // override.
    <div
      className="itera-scope"
      style={{ position: 'fixed', inset: 0, background: 'transparent', pointerEvents: 'none', zIndex: 60 }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-label={ariaLabel}
        tabIndex={manageFocus ? -1 : undefined}
        onKeyDown={onPanelKeyDown}
        style={{
          position: 'fixed',
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          // Hidden for the single frame between mount and measurement — the
          // panel has to be laid out before its own size can be read.
          visibility: pos ? 'visible' : 'hidden',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'rounded-itera-control border border-itera-border bg-itera-surface py-1 shadow-[var(--itera-shadow-float)]',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
