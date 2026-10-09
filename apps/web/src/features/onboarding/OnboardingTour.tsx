import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { tourSteps, useAuth } from '@fliptap/core'
import { Button } from '@/components/ui/Button'
import { dismissOnboarding } from './onboardingPreference'
import { applyTourExample, onboardingTour, useTourState } from './tourStore'
import './tour.css'

interface Rect { x: number; y: number; width: number; height: number }
const focusable = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'

export function OnboardingTour() {
  const state = useTourState()
  const { mode } = useAuth()
  const { pathname } = useLocation()
  const [rect, setRect] = useState<Rect | null>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const panel = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLElement | null>(null)
  const [panelHeight, setPanelHeight] = useState(220)
  const activeStep = state?.step
  const step = tourSteps.find(item => item.id === state?.step)

  useEffect(() => {
    if (!state) return
    if (pathname === '/decks') onboardingTour.event({ type: 'library-opened' })
    if (state.deckId && pathname === `/decks/${encodeURIComponent(state.deckId)}`) onboardingTour.event({ type: 'deck-opened', deckId: state.deckId })
    if (pathname !== '/review') onboardingTour.event({ type: 'navigation-ready' })
    if (pathname === '/progress') onboardingTour.event({ type: 'progress-opened' })
  }, [state, pathname])

  useLayoutEffect(() => {
    if (!activeStep || activeStep === 'complete') { setRect(null); return }
    let frame = 0
    let previous: HTMLElement | null = null
    let restore: (() => void) | undefined
    function measure() {
      const found = document.querySelector<HTMLElement>(`[data-tour="${activeStep}"]`)
      if (found !== previous) {
        restore?.()
        previous = found
        target.current = found
        if (found) {
          found.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
          const hidden: { node: HTMLElement; inert: boolean }[] = []
          let branch: HTMLElement = found
          while (branch.parentElement) {
            for (const sibling of Array.from(branch.parentElement.children)) {
              if (!(sibling instanceof HTMLElement) || sibling === branch || sibling.hasAttribute('data-tour-overlay') || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) continue
              hidden.push({ node: sibling, inert: sibling.inert })
              sibling.inert = true
            }
            branch = branch.parentElement
          }
          restore = () => hidden.forEach(({ node, inert }) => { node.inert = inert })
          const first = found.matches(focusable) ? found : found.querySelector<HTMLElement>(focusable)
          first?.focus({ preventScroll: true })
        }
      }
      const width = window.innerWidth
      const height = window.visualViewport?.height ?? window.innerHeight
      setViewport({ width, height })
      if (!found) { setRect(null); return }
      const bounds = found.getBoundingClientRect()
      const x = Math.max(8, bounds.left - 6)
      const y = Math.max(8, bounds.top - 6)
      const right = Math.min(width - 8, bounds.right + 6)
      const bottom = Math.min(height - 8, bounds.bottom + 6)
      setRect({ x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) })
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    const resize = new ResizeObserver(schedule)
    resize.observe(document.documentElement)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    window.visualViewport?.addEventListener('resize', schedule)
    measure()
    return () => {
      restore?.(); cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      window.visualViewport?.removeEventListener('resize', schedule)
      target.current = null
    }
  }, [activeStep, pathname])

  useLayoutEffect(() => {
    if (!activeStep || !panel.current) return
    const observer = new ResizeObserver(() => setPanelHeight(panel.current?.offsetHeight ?? 220))
    observer.observe(panel.current)
    return () => observer.disconnect()
  }, [activeStep])

  useEffect(() => {
    if (!activeStep) return
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismissOnboarding(); onboardingTour.stop(); return }
      if (event.key !== 'Tab') return
      const items = [
        ...(target.current?.matches(focusable) ? [target.current] : Array.from(target.current?.querySelectorAll<HTMLElement>(focusable) ?? [])),
        ...Array.from(panel.current?.querySelectorAll<HTMLElement>(focusable) ?? []),
      ].filter(node => !node.inert && node.getClientRects().length > 0)
      if (!items.length) return
      const index = items.indexOf(document.activeElement as HTMLElement)
      const next = (index + (event.shiftKey ? -1 : 1) + items.length) % items.length
      event.preventDefault()
      event.stopPropagation()
      items[next].focus()
    }
    document.addEventListener('keydown', keydown, true)
    return () => document.removeEventListener('keydown', keydown, true)
  }, [activeStep])

  if (!state || !step) return null
  const isComplete = state.step === 'complete'
  const width = Math.min(360, viewport.width - 32)
  const left = rect ? Math.max(16, Math.min(rect.x + rect.width / 2 - width / 2, viewport.width - width - 16)) : (viewport.width - width) / 2
  const below = rect ? rect.y + rect.height + 14 : 0
  const above = rect ? rect.y - panelHeight - 14 : 0
  const top = isComplete ? Math.max(16, (viewport.height - panelHeight) / 2)
    : rect && below + panelHeight <= viewport.height - 16 ? below
      : rect && above >= 16 ? above : Math.max(16, viewport.height - panelHeight - 16)
  function exit() {
    dismissOnboarding()
    onboardingTour.stop()
    const node = target.current
    ;(node?.matches(focusable) ? node : node?.querySelector<HTMLElement>(focusable))?.focus()
  }

  return createPortal(
    <div data-tour-overlay className="tour-layer">
      {rect ? <>
        <div className="tour-shade" style={{ left: 0, top: 0, width: viewport.width, height: rect.y }} />
        <div className="tour-shade" style={{ left: 0, top: rect.y + rect.height, width: viewport.width, bottom: 0 }} />
        <div className="tour-shade" style={{ left: 0, top: rect.y, width: rect.x, height: rect.height }} />
        <div className="tour-shade" style={{ left: rect.x + rect.width, right: 0, top: rect.y, height: rect.height }} />
        <div className="tour-ring" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />
      </> : <div className="tour-shade" style={{ inset: 0 }} />}
      <div ref={panel} role="region" aria-labelledby="tour-title" aria-live="polite" className="tour-coach" style={{ width, left, top }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-fliptap-muted">Quick tour · {tourSteps.findIndex(item => item.id === state.step) + 1} / {tourSteps.length}</span>
          <Button variant="ghost" className="min-h-11 px-2 text-xs" onClick={exit}>Skip tour</Button>
        </div>
        <h2 id="tour-title" className="text-lg font-bold tracking-tight text-fliptap-ink-brand">{step.title}</h2>
        <p className="mt-2 text-sm leading-6 text-fliptap-muted">{step.text}</p>
        {!rect && !isComplete && <p role="status" className="mt-2 text-xs text-fliptap-muted">Waiting for this control. You can skip at any time.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {step.action === 'input' && <Button className="min-h-11 px-4" onClick={() => applyTourExample(state.step)}>Use example</Button>}
          {(step.action === 'next' || step.action === 'input') && <Button variant="primary" className="min-h-11 px-5" disabled={!rect || (step.action === 'input' && !state.ready)} onClick={onboardingTour.next}>{state.step === 'today' ? 'Let’s go' : 'Continue'}</Button>}
          {step.action === 'control' && rect && <span className="text-xs font-medium text-fliptap-muted">Use the highlighted control</span>}
          {isComplete && <Button variant="primary" className="min-h-11 px-5" onClick={exit}>Finish tour</Button>}
        </div>
        {isComplete && <p className="mt-3 text-xs leading-5 text-fliptap-muted">{mode === 'local' ? 'Saved in this browser. Export a backup to keep a separate copy.' : 'Saved to your cloud account.'}</p>}
      </div>
    </div>, document.body,
  )
}
