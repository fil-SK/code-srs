import { cn } from '@/lib/cn'

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex items-center rounded-itera-control border border-itera-border bg-itera-surface-subtle p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cn(
            'rounded-[7px] px-2.5 py-1 text-xs font-semibold',
            option.value === value
              ? 'bg-itera-surface text-itera-ink-brand shadow-[var(--itera-shadow-card)]'
              : 'text-itera-muted hover:text-itera-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
