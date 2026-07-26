import { useNavigate, useParams } from 'react-router-dom'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { useCardV2 } from '@/hooks/useCardsV2'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// Route: cards/:id/study. The Deck-page row's primary click target — a
// non-committing preview of the card's real Review experience, whatever its
// interaction type (fresh scheduling baseline, nothing persisted), not a real
// graded session. Also the closest thing to a "Card detail" view — there is
// deliberately no separate read-only detail page (see docs/itera-decisions.md
// D69); this preview plus the Deck row's inline Edit/overflow together are
// the intended management surface. See docs/itera-decisions.md for why this
// stays a preview rather than joining the real due queue this milestone.
export function CardStudyPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: card, isLoading } = useCardV2(id)

  if (isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (!card) return null

  return (
    <IteraSurface>
      <ReviewSessionScreen
        key={card.id}
        card={card}
        definition={getInteractionDefinition(card.interaction.type)}
        current={1}
        total={1}
        onExit={() => navigate(`/decks/${card.deckId}`)}
        schedulingBefore={initialSchedulingState()}
      />
    </IteraSurface>
  )
}
