import { fliptapColors, type ApprovedIconName } from '@fliptap/core'

import type { MobileCardStatus, MobileDeckCardViewModel } from '@/src/types/library'


// How a card is drawn, kept apart from the components that draw it: the card
// row needs both of these, and the deck screen's card-type chooser needs the
// interaction glyphs on their own, so a chosen type and a listed card of that
// type cannot show different icons.

// A card's lifecycle state, as a colour. Uses the existing palette rather than
// introducing one: New is neutral, Learning is the accent already used for
// "due", and Review is the success green the progress bars use.
export const statusColors: Record<MobileCardStatus, string> = {
  New: fliptapColors.mutedLight,
  Learning: fliptapColors.accent,
  Review: fliptapColors.success,
}

export const interactionVisuals: Record<
  MobileDeckCardViewModel['interactionType'],
  { icon: ApprovedIconName; backgroundColor: string }
> = {
  recall: { icon: 'recall', backgroundColor: fliptapColors.navy },
  walkthrough: { icon: 'walkthrough', backgroundColor: '#0d9488' },
  multiple_choice: { icon: 'multiple_choice', backgroundColor: '#f59e0b' },
  write_code: { icon: 'write_code', backgroundColor: '#2563eb' },
  ordering: { icon: 'ordering', backgroundColor: '#059669' },
  matching: { icon: 'matching', backgroundColor: '#7c3aed' },
}
