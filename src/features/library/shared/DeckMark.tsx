import { cn } from '@/lib/cn'

// Restrained square deck mark: a navy tile with bold initials, plus a small
// diagonal corner ribbon (drawn, not an image asset) — mirrors
// ContinueLearningList.tsx's existing badge-chip recipe
// (rounded-itera-control bg-itera-navy font-mono text-xs font-bold text-white),
// scaled up for the deck header.
const SIZE_CLASS: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'grid h-9 w-9 place-items-center text-xs',
  md: 'grid h-11 w-11 place-items-center text-[13px]',
  lg: 'grid h-20 w-20 place-items-center text-2xl',
  xl: 'grid h-[148px] w-[148px] place-items-center text-5xl',
}

export function DeckMark({
  label,
  size = 'sm',
}: {
  label: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const isLarge = size === 'lg' || size === 'xl'
  const isMedium = size === 'md'
  return (
    <div
      className={cn(
        'relative flex-none overflow-hidden rounded-itera-control bg-itera-navy font-mono font-bold text-white',
        SIZE_CLASS[size],
      )}
    >
      <span className="relative z-10">{label}</span>
      <div
        className="absolute bg-slate-500/45"
        style={{
          bottom: isLarge ? -26 : isMedium ? -11 : -8,
          right: isLarge ? -48 : isMedium ? -21 : -16,
          width: isLarge ? 150 : isMedium ? 62 : 46,
          height: isLarge ? 34 : isMedium ? 14 : 10,
          transform: 'rotate(-34deg)',
        }}
      />
      <div
        className="absolute bg-itera-accent"
        style={{
          bottom: isLarge ? -9 : isMedium ? -4 : -3,
          right: isLarge ? -42 : isMedium ? -18 : -14,
          width: isLarge ? 138 : isMedium ? 57 : 42,
          height: isLarge ? 11 : isMedium ? 5 : 4,
          transform: 'rotate(-34deg)',
        }}
      />
      <div
        className="absolute bg-itera-error"
        style={{
          bottom: isLarge ? 1 : 0,
          right: isLarge ? -51 : isMedium ? -22 : -17,
          width: isLarge ? 132 : isMedium ? 54 : 40,
          height: isLarge ? 5 : isMedium ? 3 : 2,
          transform: 'rotate(-34deg)',
        }}
      />
    </div>
  )
}
