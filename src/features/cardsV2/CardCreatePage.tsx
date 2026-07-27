import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { InteractionType } from '@/types/cardV2'
import { emptyRecallForm } from '@/domain/cardsV2/recallForm'
import { emptyMultipleChoiceForm } from '@/domain/cardsV2/multipleChoiceForm'
import { emptyWriteCodeForm } from '@/domain/cardsV2/writeCodeForm'
import { emptyOrderingForm } from '@/domain/cardsV2/orderingForm'
import { emptyMatchingForm } from '@/domain/cardsV2/matchingForm'
import { emptyWalkthroughForm } from '@/domain/cardsV2/walkthroughForm'
import { CardTypeChooser } from './CardTypeChooser'
import { RecallEditorShell } from './RecallEditorShell'
import { MultipleChoiceEditorShell } from './MultipleChoiceEditorShell'
import { WriteCodeEditorShell } from './WriteCodeEditorShell'
import { OrderingEditorShell } from './OrderingEditorShell'
import { MatchingEditorShell } from './MatchingEditorShell'
import { WalkthroughEditorShell } from './WalkthroughEditorShell'

// Route: decks/:deckId/cards/new. Spec §22.1's create flow as one continuous
// screen: choose interaction -> author content -> preview -> save. All six
// interaction types are selectable (see CardTypeChooser).
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

  if (selectedType === 'write_code') {
    return (
      <WriteCodeEditorShell
        mode="create"
        initialForm={emptyWriteCodeForm(deckId)}
        target={{ kind: 'new' }}
        backTo={backTo}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (selectedType === 'ordering') {
    return (
      <OrderingEditorShell
        mode="create"
        initialForm={emptyOrderingForm(deckId)}
        target={{ kind: 'new' }}
        backTo={backTo}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (selectedType === 'matching') {
    return (
      <MatchingEditorShell
        mode="create"
        initialForm={emptyMatchingForm(deckId)}
        target={{ kind: 'new' }}
        backTo={backTo}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (selectedType === 'walkthrough') {
    return (
      <WalkthroughEditorShell
        mode="create"
        initialForm={emptyWalkthroughForm(deckId)}
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
