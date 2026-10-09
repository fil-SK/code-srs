import { createContext, useContext, useId, useState, type ReactNode } from 'react'
import { TipPanel } from './TipPanel'

interface HintState {
  open: boolean
  toggle: () => void
  panelId: string
  title: string
}
const HintContext = createContext<HintState | null>(null)

// Each card or step owns a disclosure; it never changes the answer or grading state.
export function CardHintScope({ text, active, title = 'Hint', children }: {
  text: string | undefined
  active: boolean
  title?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const available = active && Boolean(text?.trim())
  return (
    <HintContext value={available ? { open, toggle: () => setOpen(value => !value), panelId, title } : null}>
      {children}
      <div id={panelId} hidden={!available || !open}>
        {available && open && <TipPanel text={text} title={title} />}
      </div>
    </HintContext>
  )
}

export function HintToggle() {
  const hint = useContext(HintContext)
  if (!hint) return null
  const stepScoped = hint.title !== 'Hint'
  return (
    <div className="mt-5 border-t border-fliptap-border/60 pt-2 text-left">
      <button type="button" onClick={hint.toggle} aria-expanded={hint.open} aria-controls={hint.panelId}
        className="fliptap-hint-toggle inline-flex min-h-11 items-center gap-2 rounded-fliptap-control px-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-fliptap-accent focus-visible:ring-offset-2"
        data-open={hint.open}>
        <svg width="20" height="22" viewBox="0 0 24 26" fill="none" aria-hidden="true">
          <path d="M7.5 17.5c0-2-3.5-3.6-3.5-8a8 8 0 0 1 16 0c0 4.4-3.5 6-3.5 8Z" fill={hint.open ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="m9 10 3 3 3-3m-3 3v4" stroke={hint.open ? 'var(--fliptap-surface)' : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 20h8m-7 3h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {hint.open ? (stepScoped ? 'Hide step hint' : 'Hide hint') : (stepScoped ? 'Show step hint' : 'Show hint')}
      </button>
    </div>
  )
}
