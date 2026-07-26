import { useNavigate, useParams } from 'react-router-dom'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { useCardV2 } from '@/hooks/useCardsV2'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { IteraSurface } from '@/features/reviewV2/components/IteraSurface'

// Route: cards/:id/study. The Deck-page row's primary click target — a
// non-committing preview of the real Recall review experience (fresh
// scheduling baseline, nothing persisted), not a real graded session. See
// docs/itera-decisions.md for why this stays a preview rather than joining
// the real due queue this milestone.
export function CardStudyPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: card, isLoading } = useCardV2(id)

  if (isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (!card || card.interaction.type !== 'recall') return null

  return (
    <IteraSurface>
      <ReviewSessionScreen
        key={card.id}
        card={card}
        definition={getInteractionDefinition('recall')}
        current={1}
        total={1}
        onExit={() => navigate(`/decks/${card.deckId}`)}
        schedulingBefore={initialSchedulingState()}
      />
    </IteraSurface>
  )
}
