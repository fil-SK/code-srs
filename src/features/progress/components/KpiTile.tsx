import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Sparkline } from './Sparkline'

// One delta value (either a percent change for counts, or a percentage-point
// change for rates) rendered as an arrow + magnitude + comparison label.
// `null` means there's no prior-period data to compare against (rather than
// showing a misleading "0%").
export function KpiDelta({
  delta,
  comparisonLabel,
  dark,
}: {
  delta: number | null
  comparisonLabel: string
  dark?: boolean
}) {
  if (delta === null) {
    return (
      <span className={dark ? 'text-white/60' : 'text-itera-muted'}>No prior data</span>
    )
  }
  const rounded = Math.round(Math.abs(delta))
  const flat = rounded === 0
  const positive = delta > 0
  const Icon = flat ? Minus : positive ? ArrowUp : ArrowDown
  const tone = flat
    ? dark
      ? 'text-white/70'
      : 'text-itera-muted'
    : positive
      ? 'text-itera-success'
      : 'text-itera-error'

  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', tone)}>
      <Icon size={11} />
      {rounded}
      {flat ? '' : '%'} vs {comparisonLabel}
    </span>
  )
}

export function KpiTile({
  icon: Icon,
  label,
  value,
  footer,
  sparkline,
  variant = 'light',
}: {
  icon: LucideIcon
  label: string
  value: string
  footer?: React.ReactNode
  sparkline?: number[]
  variant?: 'light' | 'dark'
}) {
  const dark = variant === 'dark'

  return (
    <div
      className={cn(
        'rounded-itera-card border p-4',
        dark
          ? 'border-itera-navy bg-itera-navy'
          : 'border-itera-border bg-itera-surface shadow-[var(--itera-shadow-card)]',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid h-7 w-7 flex-none place-items-center rounded-itera-control',
            dark ? 'bg-white/10' : 'bg-itera-accent-soft',
          )}
        >
          <Icon size={14} className={dark ? 'text-white' : 'text-itera-accent'} />
        </span>
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-wide',
            dark ? 'text-white/70' : 'text-itera-muted',
          )}
        >
          {label}
        </span>
      </div>

      <div
        className={cn(
          'mt-2 font-itera-display text-3xl font-bold',
          dark ? 'text-white' : 'text-itera-ink-brand',
        )}
      >
        {value}
      </div>

      {sparkline && sparkline.length >= 2 && (
        <div className="mt-1">
          <Sparkline values={sparkline} color="var(--itera-accent)" />
        </div>
      )}

      {footer && <div className="mt-1 text-xs">{footer}</div>}
    </div>
  )
}
