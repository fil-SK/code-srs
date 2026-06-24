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
  const { Question, Answer } = getCardDefinition(card.type)

  return (
    <>
      <Question
        content={card.content}
        revealed={revealed}
        response={response}
        setResponse={setResponse}
      />
      {revealed && (
        <div className="reveal-in mt-5 border-t border-dashed border-border pt-4">
          <Answer content={card.content} response={response} />
        </div>
      )}
    </>
  )
}
