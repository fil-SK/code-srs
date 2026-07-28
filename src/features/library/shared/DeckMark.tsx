import { cn } from '@/lib/cn'

// Restrained square deck mark: a navy tile with bold initials, plus a subtle
// diagonal accent line in one corner (drawn, not an image asset) — mirrors
// ContinueLearningList.tsx's existing badge-chip recipe
// (rounded-itera-control bg-itera-navy font-mono text-xs font-bold text-white),
// scaled up for the deck header.
const SIZE_CLASS: Record<'sm' | 'lg' | 'xl', string> = {
  sm: 'grid h-9 w-9 place-items-center text-xs',
  lg: 'grid h-20 w-20 place-items-center text-2xl',
  xl: 'grid h-[148px] w-[148px] place-items-center text-5xl',
}

export function DeckMark({
  label,
  size = 'sm',
}: {
  label: string
  size?: 'sm' | 'lg' | 'xl'
}) {
  const accentHeight = size === 'xl' ? 10 : size === 'lg' ? 6 : 3
  return (
    <div
      className={cn(
        'relative flex-none overflow-hidden rounded-itera-control bg-itera-navy font-mono font-bold text-white',
        SIZE_CLASS[size],
      )}
    >
      <span className="relative z-10">{label}</span>
      <div
        className="absolute inset-x-0 bottom-0 bg-itera-accent"
        style={{
          height: accentHeight,
          transform: 'skewY(-3deg) translateY(50%)',
        }}
      />
    </div>
  )
}
