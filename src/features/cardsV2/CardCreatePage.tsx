import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { InteractionType } from '@/types/cardV2'
import { emptyRecallForm } from '@/domain/cardsV2/recallForm'
import { emptyMultipleChoiceForm } from '@/domain/cardsV2/multipleChoiceForm'
import { CardTypeChooser } from './CardTypeChooser'
import { RecallEditorShell } from './RecallEditorShell'
import { MultipleChoiceEditorShell } from './MultipleChoiceEditorShell'

// Route: decks/:deckId/cards/new. Spec §22.1's create flow as one continuous
// screen: choose interaction -> author content -> preview -> save. Recall
// and Multiple Choice are selectable today (see CardTypeChooser).
export function CardCreatePage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState<InteractionType | null>(null)

  const backTo = deckId ? `/decks/${deckId}` : '/decks'

  if (selectedType === 'recall') {
    return (
      <RecallEditorShell
        mode="create"
        initialForm={emptyRecallForm(deckId)}
        target={{ kind: 'new' }}
        backTo={backTo}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (selectedType === 'multiple_choice') {
    return (
      <MultipleChoiceEditorShell
        mode="create"
        initialForm={emptyMultipleChoiceForm(deckId)}
        target={{ kind: 'new' }}
        backTo={backTo}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="mb-4 text-xs text-itera-muted hover:text-itera-ink"
      >
        ← Cancel
      </button>
      <CardTypeChooser onSelect={setSelectedType} />
    </div>
  )
}
