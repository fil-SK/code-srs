import { useDeleteCard } from '@itera/core'
import { useRouter } from 'expo-router'
import { useState } from 'react'

import { isAuthorableInteraction } from '@/src/components/cards/authoringTypes'
import { ActionSheet, type ActionSheetItem } from '@/src/components/ui/ActionSheet'
import { ConfirmSheet } from '@/src/components/ui/ConfirmSheet'
import type { MobileDeckCardViewModel } from '@/src/types/library'

// What can be done to one card, wherever that card is listed.
//
// Edit is offered only for the interaction types this platform can currently
// author. The other four are fully studyable and reviewable and nothing here
// calls them broken - they simply have no editor yet, so no control claims one
// (see authoringTypes.ts).
//
// Lifted out of the deck screen with CardRow, so a card listed on a Collection
// can be managed the same way as one listed on a deck rather than being visible
// but untouchable.
export function CardActions({
  card,
  onClose,
}: {
  /** The card whose actions are open, or null when none are. */
  card: MobileDeckCardViewModel | null
  onClose: () => void
}) {
  const router = useRouter()
  const deleteCard = useDeleteCard()
  const [pendingDelete, setPendingDelete] = useState<MobileDeckCardViewModel | null>(null)

  const items: ActionSheetItem[] = card
    ? [
        ...(isAuthorableInteraction(card.interactionType)
          ? [
              {
                label: 'Edit card',
                icon: 'pencil-outline' as const,
                onPress: () =>
                  router.push({ pathname: '/card/[cardId]/edit', params: { cardId: card.id } }),
              },
            ]
          : []),
        {
          label: 'Delete card',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () => setPendingDelete(card),
        },
      ]
    : []

  return (
    <>
      <ActionSheet
        items={items}
        onClose={onClose}
        subtitle={card?.prompt}
        title="Card actions"
        visible={card !== null}
      />

      <ConfirmSheet
        confirmLabel="Delete card"
        description={
          pendingDelete
            ? `“${pendingDelete.prompt}” will be removed permanently. This cannot be undone.`
            : ''
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteCard.mutate(pendingDelete.id)
        }}
        title="Delete this card?"
        visible={pendingDelete !== null}
      />
    </>
  )
}
