import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { iteraColors } from '@itera/core'
import type { ComponentProps } from 'react'

import type { MobileCardStatus, MobileDeckCardViewModel } from '@/src/types/library'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

// How a card is drawn, kept apart from the components that draw it: the card
// row needs both of these, and the deck screen's card-type chooser needs the
// interaction glyphs on their own, so a chosen type and a listed card of that
// type cannot show different icons.

// A card's lifecycle state, as a colour. Uses the existing palette rather than
// introducing one: New is neutral, Learning is the accent already used for
// "due", and Review is the success green the progress bars use.
export const statusColors: Record<MobileCardStatus, string> = {
  New: iteraColors.mutedLight,
  Learning: iteraColors.accent,
  Review: iteraColors.success,
}

export const interactionVisuals: Record<
  MobileDeckCardViewModel['interactionType'],
  { icon: IconName; backgroundColor: string }
> = {
  recall: { icon: 'code-braces', backgroundColor: iteraColors.navy },
  walkthrough: { icon: 'source-branch', backgroundColor: '#0d9488' },
  multiple_choice: { icon: 'format-list-checks', backgroundColor: '#f59e0b' },
  write_code: { icon: 'code-tags', backgroundColor: '#2563eb' },
  ordering: { icon: 'format-list-numbered', backgroundColor: '#059669' },
  matching: { icon: 'vector-link', backgroundColor: '#7c3aed' },
}
