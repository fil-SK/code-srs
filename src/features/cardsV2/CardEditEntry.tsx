import { Link, useNavigate, useParams } from 'react-router-dom'
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
import {
  cardV2RecordToOrderingForm,
  legacyOrderingCardToForm,
} from '@/domain/cardsV2/orderingForm'
import {
  cardV2RecordToMatchingForm,
  legacyMatchingCardToForm,
} from '@/domain/cardsV2/matchingForm'
import {
  cardV2RecordToWalkthroughForm,
  legacyStoryCardToForm,
} from '@/domain/cardsV2/walkthroughForm'
import { Button } from '@/components/ui/Button'
import { RecallEditorShell } from './RecallEditorShell'
import { MultipleChoiceEditorShell } from './MultipleChoiceEditorShell'
import { WriteCodeEditorShell } from './WriteCodeEditorShell'
import { OrderingEditorShell } from './OrderingEditorShell'
import { MatchingEditorShell } from './MatchingEditorShell'
import { WalkthroughEditorShell } from './WalkthroughEditorShell'

const RECALL_SHAPED_V1_TYPES = new Set(['basic', 'codeReading', 'bugFinding'])

// Route: cards/:id/edit. Every card, both models, is authored through a v2
// editor shell: a v1 basic/codeReading/bugFinding card opens the Recall
// editor, a v1 mcq card opens the Multiple Choice editor, a v1
// codeCompletion card opens the Write Code editor, a v1 ordering card opens
// the Ordering editor, a v1 matching card opens the Matching editor, a v1
// story card opens the Walkthrough editor (all six migrate to a
// CardV2Record on save); a CardV2Record opens its editor directly by
// interaction type.
//
// The branches below cover all 8 members of the v1 CardType union, so the
// final return is reachable only when `id` resolves to neither model — a
// deleted or mistyped card id. There is deliberately no v1-editor escape
// hatch left: the v1 registry editor was deleted (docs/itera-decisions.md).
export function CardEditEntry() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const v1 = useCard(id)
  const v2 = useCardV2(id)

  if (v1.isLoading || v2.isLoading) {
    return <p className="text-sm text-itera-muted">Loading…</p>
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

  if (v1.data && v1.data.type === 'ordering') {
    const card = v1.data
    return (
      <OrderingEditorShell
        mode="edit"
        initialForm={legacyOrderingCardToForm(card)}
        target={{ kind: 'v1', card }}
        backTo={`/decks/${card.deckId}`}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (v2.data && v2.data.interaction.type === 'ordering') {
    const record = v2.data
    return (
      <OrderingEditorShell
        mode="edit"
        initialForm={cardV2RecordToOrderingForm(record)}
        target={{ kind: 'v2', record }}
        backTo={`/decks/${record.deckId}`}
        onSaved={(saved) => navigate(`/decks/${saved.deckId}`)}
      />
    )
  }

  if (v1.data && v1.data.type === 'matching') {
    const card = v1.data
    return (
      <MatchingEditorShell
        mode="edit"
        initialForm={legacyMatchingCardToForm(card)}
        target={{ kind: 'v1', card }}
        backTo={`/decks/${card.deckId}`}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (v2.data && v2.data.interaction.type === 'matching') {
    const record = v2.data
    return (
      <MatchingEditorShell
        mode="edit"
        initialForm={cardV2RecordToMatchingForm(record)}
        target={{ kind: 'v2', record }}
        backTo={`/decks/${record.deckId}`}
        onSaved={(saved) => navigate(`/decks/${saved.deckId}`)}
      />
    )
  }

  if (v1.data && v1.data.type === 'story') {
    const card = v1.data
    return (
      <WalkthroughEditorShell
        mode="edit"
        initialForm={legacyStoryCardToForm(card)}
        target={{ kind: 'v1', card }}
        backTo={`/decks/${card.deckId}`}
        onSaved={(record) => navigate(`/decks/${record.deckId}`)}
      />
    )
  }

  if (v2.data && v2.data.interaction.type === 'walkthrough') {
    const record = v2.data
    return (
      <WalkthroughEditorShell
        mode="edit"
        initialForm={cardV2RecordToWalkthroughForm(record)}
        target={{ kind: 'v2', record }}
        backTo={`/decks/${record.deckId}`}
        onSaved={(saved) => navigate(`/decks/${saved.deckId}`)}
      />
    )
  }

  return (
    <div className="mx-auto max-w-md rounded-itera-card border border-dashed border-itera-border bg-itera-surface p-10 text-center">
      <div className="text-lg font-semibold text-itera-ink-brand">Card not found</div>
      <p className="mt-2 text-sm text-itera-muted">
        This card may have been deleted, or the link may be out of date.
      </p>
      <Link to="/decks" className="mt-4 inline-block">
        <Button variant="primary">Back to Library</Button>
      </Link>
    </div>
  )
}
