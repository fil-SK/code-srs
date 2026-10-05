import { useId, useRef, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { DECK_ICONS, DECK_ICON_CATEGORIES, getDeckIcon, type DeckIconId } from '@fliptap/core'
import { fieldClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { DeckMark } from './DeckMark'
import { DECK_ICON_VIEWS } from './deckIconViews'

export function DeckIconPicker({ value, onChange }: {
  value?: DeckIconId
  onChange: (iconId: DeckIconId) => void
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const selected = getDeckIcon(value)
  const query = search.trim().toLowerCase()
  const icons = DECK_ICONS.filter((icon) =>
    (category === 'All' || icon.category === category) &&
    `${icon.label} ${icon.keywords}`.toLowerCase().includes(query),
  )

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-fliptap-muted">Deck icon</legend>
      <div className="flex items-center gap-3">
        <DeckMark iconId={selected.id} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-fliptap-ink-brand">{selected.label}</div>
          <div className="text-xs text-fliptap-muted">Your deck's visual identity</div>
        </div>
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-choices`}
          className="rounded-fliptap-control border border-fliptap-border px-3 py-2 text-sm font-semibold text-fliptap-ink-brand transition-colors hover:bg-fliptap-surface-subtle"
          onClick={() => { setOpen(!open); setSearch(''); setCategory('All') }}
        >
          {open ? 'Close chooser' : 'Choose icon'}
        </button>
      </div>
      {open && (
        <div id={`${id}-choices`} className="mt-3 rounded-fliptap-control border border-fliptap-border bg-fliptap-surface-subtle p-3">
          <label htmlFor={`${id}-search`} className="sr-only">Search deck icons</label>
          <div className="relative">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-fliptap-muted" />
            <input
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search icons…"
              className={cn(fieldClass, 'pl-9')}
            />
          </div>
          <div className="my-3 flex flex-wrap gap-1" role="group" aria-label="Icon categories">
            {['All', ...DECK_ICON_CATEGORIES].map((item) => (
              <button key={item} type="button" aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className={cn('rounded-fliptap-control px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  category === item ? 'bg-fliptap-navy text-white' : 'text-fliptap-muted hover:bg-fliptap-navy-soft')}
              >{item}</button>
            ))}
          </div>
          <div role="group" aria-label="Icon choices" className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-6">
            {icons.map((icon) => {
              const Icon = DECK_ICON_VIEWS[icon.id]
              const active = selected.id === icon.id
              return (
                <button key={icon.id} type="button" aria-label={icon.label} aria-pressed={active}
                  title={icon.label}
                  className={cn('relative flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-fliptap-control border px-1 py-2 text-fliptap-ink-brand transition-colors',
                    active ? 'border-fliptap-selection-border bg-fliptap-selection-soft' : 'border-fliptap-border bg-fliptap-surface hover:border-fliptap-border-strong')}
                  onClick={() => { onChange(icon.id); setOpen(false); trigger.current?.focus() }}
                >
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  <span className="max-w-full text-center text-[10px] leading-tight">{icon.label}</span>
                  {active && <Check size={11} className="absolute right-1 top-1" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
          {icons.length === 0 && <p role="status" className="py-5 text-center text-sm text-fliptap-muted">No matching icons. Try another search or category.</p>}
        </div>
      )}
    </fieldset>
  )
}
