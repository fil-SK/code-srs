import { useNavigate, useParams } from 'react-router-dom'
import { useCard } from '@/hooks/useCards'
import { useCardV2 } from '@/hooks/useCardsV2'
import { cardV2RecordToForm, legacyCardToForm } from '@/domain/cardsV2/recallForm'
import {
  cardV2RecordToMultipleChoiceForm,
  legacyMcqCardToForm,
} from '@/domain/cardsV2/multipleChoiceForm'
import {
  cardV2RecordToWriteCodeForm,
  legacyWriteCodeCardToForm,
} from '@/domain/cardsV2/writeCodeForm'
import { CardEditorPage } from '@/features/cards/CardEditorPage'
import { RecallEditorShell } from './RecallEditorShell'
import { MultipleChoiceEditorShell } from './MultipleChoiceEditorShell'
import { WriteCodeEditorShell } from './WriteCodeEditorShell'

const RECALL_SHAPED_V1_TYPES = new Set(['basic', 'codeReading', 'bugFinding'])

// Route: cards/:id/edit. Branches between the new Recall/Multiple
// Choice/Write Code editors and the untouched v1 registry editor, since both
// still coexist during the transition (see docs/itera-decisions.md): a v1
// basic/codeReading/bugFinding card opens the Recall editor, a v1 mcq card
// opens the Multiple Choice editor, a v1 codeCompletion card opens the Write
// Code editor (all three migrate to a CardV2Record on save); a CardV2Record
// opens its matching editor directly by interaction type; anything else (the
// remaining v1 types) falls through to the old CardEditorPage, unmodified.
export function CardEditEntry() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const v1 = useCard(id)
  const v2 = useCardV2(id)

  if (v1.isLoading || v2.isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (v1.data && RECALL_SHAPED_V1_TYPES.has(v1.data.type)) {
    const card = v1.data
    return (
      <RecallEditorShell
        mode="edit"
        initialForm={legacyCardToForm(card)}
        target={{ kind: 'v1', card }}
        backTo={`/decks/${card.deckId}`}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (v1.data && v1.data.type === 'mcq') {
    const card = v1.data
    return (
      <MultipleChoiceEditorShell
        mode="edit"
        initialForm={legacyMcqCardToForm(card)}
        target={{ kind: 'v1', card }}
        backTo={`/decks/${card.deckId}`}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (v2.data && v2.data.interaction.type === 'recall') {
    const record = v2.data
    return (
      <RecallEditorShell
        mode="edit"
        initialForm={cardV2RecordToForm(record)}
        target={{ kind: 'v2', record }}
        backTo={`/decks/${record.deckId}`}
        onSaved={(saved) => navigate(`/decks/${saved.deckId}`)}
      />
    )
  }

  if (v2.data && v2.data.interaction.type === 'multiple_choice') {
    const record = v2.data
    return (
      <MultipleChoiceEditorShell
        mode="edit"
        initialForm={cardV2RecordToMultipleChoiceForm(record)}
        target={{ kind: 'v2', record }}
        backTo={`/decks/${record.deckId}`}
        onSaved={(saved) => navigate(`/decks/${saved.deckId}`)}
      />
    )
  }

  if (v1.data && v1.data.type === 'codeCompletion') {
    const card = v1.data
    return (
      <WriteCodeEditorShell
        mode="edit"
        initialForm={legacyWriteCodeCardToForm(card)}
        target={{ kind: 'v1', card }}
        backTo={`/decks/${card.deckId}`}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (v2.data && v2.data.interaction.type === 'write_code') {
    const record = v2.data
    return (
      <WriteCodeEditorShell
        mode="edit"
        initialForm={cardV2RecordToWriteCodeForm(record)}
        target={{ kind: 'v2', record }}
        backTo={`/decks/${record.deckId}`}
        onSaved={(saved) => navigate(`/decks/${saved.deckId}`)}
      />
    )
  }

  return <CardEditorPage />
}
