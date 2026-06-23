import type { CardType } from '@/types'
import { cn } from '@/lib/cn'
import { cardTypeMeta } from './cardTypeMeta'

export function CardTypeBadge({ type }: { type: CardType }) {
  const meta = cardTypeMeta[type]
  return (
    <span
      className={cn(
        'rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        meta.badgeClass,
      )}
    >
      {meta.label}
    </span>
  )
}
