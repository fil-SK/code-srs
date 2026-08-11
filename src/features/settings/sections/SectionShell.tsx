import type { ReactNode } from 'react'
import { Construction } from 'lucide-react'
import { cn } from '@/lib/cn'

// Shared frame for every Account settings section: heading, one-line
// description, optional header action, then the section body.
export function SectionShell({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-itera-display text-xl font-bold tracking-tight text-itera-ink-brand">
            {title}
          </h2>
          <p className="mt-1 text-sm text-itera-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// Stated once per section rather than repeated on every control: the greying
// below is "not built yet", not "temporarily unavailable" or "you lack
// permission". Without this the disabled state is only communicated by color.
export function NotBuiltYet({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-itera-control border border-itera-border bg-itera-surface-subtle px-4 py-3 text-sm text-itera-muted">
      <Construction size={16} aria-hidden="true" className="mt-0.5 flex-none text-itera-warning" />
      <p>{children ?? 'Not available yet. This section is a placeholder for planned work.'}</p>
    </div>
  )
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-itera-card border border-itera-border bg-itera-surface p-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

// A whole section that does not exist yet: the note plus a short, honest list
// of what it is meant to hold once it does.
export function PlaceholderSection({
  title,
  description,
  planned,
  note,
}: {
  title: string
  description: string
  planned: string[]
  note?: ReactNode
}) {
  return (
    <SectionShell title={title} description={description}>
      <NotBuiltYet>{note}</NotBuiltYet>
      <Panel>
        <h3 className="text-xs font-bold uppercase tracking-wider text-itera-muted">Planned</h3>
        <ul className="mt-3 space-y-2">
          {planned.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-itera-muted-light">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 flex-none rounded-full bg-itera-border-strong"
              />
              {item}
            </li>
          ))}
        </ul>
      </Panel>
    </SectionShell>
  )
}
