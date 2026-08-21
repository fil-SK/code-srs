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
  unit = 'percent',
}: {
  delta: number | null
  comparisonLabel: string
  dark?: boolean
  unit?: 'percent' | 'percentagePoints'
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
      {unit === 'percentagePoints' ? ' pp' : '%'} vs {comparisonLabel}
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
  iconTone = 'accent',
  iconFilled = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  footer?: React.ReactNode
  sparkline?: number[]
  variant?: 'light' | 'dark'
  iconTone?: 'accent' | 'navy' | 'success' | 'warning'
  iconFilled?: boolean
}) {
  const dark = variant === 'dark'
  const lightIconTone = {
    accent: 'bg-itera-accent-soft text-itera-accent',
    navy: 'bg-itera-navy-soft text-itera-navy',
    success: 'bg-itera-success-soft text-itera-success',
    warning: 'bg-itera-warning-soft text-itera-warning',
  }[iconTone]

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'rounded-itera-card border p-5',
        dark
          ? 'border-itera-navy bg-itera-navy'
          : 'border-itera-border bg-itera-surface shadow-[var(--itera-shadow-card)]',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid h-9 w-9 flex-none place-items-center',
            dark ? 'rounded-itera-control bg-white/10 text-white' : `rounded-full ${lightIconTone}`,
          )}
        >
          <Icon size={17} strokeWidth={2.15} fill={iconFilled ? 'currentColor' : 'none'} aria-hidden="true" />
        </span>
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-wide',
            dark ? 'text-white/70' : 'text-itera-muted',
          )}
        >
          {label}
        </span>
      </div>

      <div className="mt-3 flex min-w-0 items-end gap-3">
        <div
          className={cn(
            'min-w-0 font-itera-display text-[30px] font-medium leading-none',
            dark ? 'text-white' : 'text-itera-ink-brand',
          )}
        >
          {value}
        </div>
        {sparkline && sparkline.length >= 2 && (
          <div className="min-w-0 flex-1 pb-0.5">
            <Sparkline values={sparkline} color="var(--itera-accent)" width={76} />
          </div>
        )}
      </div>

      {footer && <div className="mt-2 text-xs">{footer}</div>}
    </div>
  )
}
