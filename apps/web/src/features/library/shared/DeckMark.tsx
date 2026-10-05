import { getDeckIcon, type DeckIconId } from '@fliptap/core'
import { cn } from '@/lib/cn'
import { DECK_ICON_VIEWS } from './deckIconViews'

const SIZES = {
  sm: { className: 'h-9 w-9', icon: 18 },
  md: { className: 'h-11 w-11', icon: 22 },
  lg: { className: 'h-20 w-20', icon: 40 },
  xl: { className: 'h-[148px] w-[148px]', icon: 64 },
}

// One restrained treatment at every size, including old decks without a choice.
export function DeckMark({
  iconId,
  size = 'sm',
  className,
}: {
  iconId?: DeckIconId
  size?: keyof typeof SIZES
  className?: string
}) {
  const icon = getDeckIcon(iconId)
  const Icon = DECK_ICON_VIEWS[icon.id]
  return (
    <div
      aria-hidden="true"
      data-deck-icon={icon.id}
      className={cn(
        'grid flex-none place-items-center rounded-fliptap-control bg-fliptap-navy text-white',
        SIZES[size].className,
        className,
      )}
    >
      <Icon size={SIZES[size].icon} strokeWidth={1.75} />
    </div>
  )
}
