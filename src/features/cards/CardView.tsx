import type { Card } from '@/types'
import type { CardResponse } from './registry/types'
import { getCardDefinition } from './registry'

// Renders a card's question, and its answer once revealed, by dispatching to the
// registered renderer for its type. Used by the review session.
export function CardView({
  card,
  revealed,
  response,
  setResponse,
}: {
  card: Card
  revealed: boolean
  response: CardResponse
  setResponse: (response: CardResponse) => void
}) {
  const def = getCardDefinition(card.type)

  if (!def) {
    return (
      <div className="text-sm text-muted">
        This card type renders in a later M3 checkpoint. Reveal and self-grade
        still work.
      </div>
    )
  }

  const { Question, Answer } = def

  return (
    <>
      <Question
        content={card.content}
        revealed={revealed}
        response={response}
        setResponse={setResponse}
      />
      {revealed && (
        <div className="mt-5 border-t border-dashed border-border pt-4">
          <Answer content={card.content} response={response} />
        </div>
      )}
    </>
  )
}
