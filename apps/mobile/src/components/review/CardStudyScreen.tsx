import type { Card, CardInteraction } from '@itera/core'

import { ReviewSessionScreen } from './ReviewSessionScreen'
import { nativeInteractionFor } from './interactions/registry'

// One authored card, inspected outside a session.
//
// The native equivalent of web's CardStudyPreviewPage: the Deck row's primary
// tap target, and the closest thing either platform has to a card detail view -
// web deliberately has no separate read-only page (itera-decisions D69), and
// mobile does not invent one.
//
// It is the mirror of DemoReviewSession: that one owns a queue and hands each
// card to the session shell with a grade hand-off, this one owns a single card
// and hands it over without one. Both bind the same registry and render the
// same shell, so all six interaction types work here for the same reason they
// work in a session, and a seventh type would need no route work at all.
//
// Nothing about this surface can record anything. There is no ReviewLog, no
// rating, no scheduler call and no repository write - not because the writes are
// suppressed, but because the props that would carry them do not exist in study
// mode.

export function CardStudyScreen({ card, onExit }: { card: Card; onExit: () => void }) {
  const definition = nativeInteractionFor(card.interaction.type)

  return (
    <ReviewSessionScreen
      // Same remount rule the session follows, so arriving at a different card
      // resets phase, response and timing rather than inheriting them.
      key={card.id}
      card={
        card as Card & {
          interaction: Extract<CardInteraction, { type: typeof card.interaction.type }>
        }
      }
      definition={definition}
      mode="study"
      onExit={onExit}
    />
  )
}
