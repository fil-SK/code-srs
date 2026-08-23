import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCard } from '@/hooks/useCards'
import { cardRecordToForm } from '@/domain/cards/recallForm'
import { cardRecordToMultipleChoiceForm } from '@/domain/cards/multipleChoiceForm'
import { cardRecordToWriteCodeForm } from '@/domain/cards/writeCodeForm'
import { cardRecordToOrderingForm } from '@/domain/cards/orderingForm'
import { cardRecordToMatchingForm } from '@/domain/cards/matchingForm'
import { cardRecordToWalkthroughForm } from '@/domain/cards/walkthroughForm'
import { Button } from '@/components/ui/Button'
import { RecallEditorShell } from './RecallEditorShell'
import { MultipleChoiceEditorShell } from './MultipleChoiceEditorShell'
import { WriteCodeEditorShell } from './WriteCodeEditorShell'
import { OrderingEditorShell } from './OrderingEditorShell'
import { MatchingEditorShell } from './MatchingEditorShell'
import { WalkthroughEditorShell } from './WalkthroughEditorShell'

// Route: cards/:id/edit. One switch over the card's interaction type, one
// editor shell per interaction. The `default` arm is reachable only when `id`
// resolves to no card at all — a deleted or mistyped id — because the switch
// covers every member of the CardInteraction union.
export function CardEditEntry() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const query = useCard(id)

  if (query.isLoading) {
    return <p className="text-sm text-itera-muted">Loading…</p>
  }

  const record = query.data
  if (record) {
    const shared = {
      mode: 'edit' as const,
      target: { kind: 'existing' as const, record },
      backTo: `/decks/${record.deckId}`,
      onSaved: (saved: { deckId: string }) => navigate(`/decks/${saved.deckId}`),
    }

    switch (record.interaction.type) {
      case 'recall':
        return <RecallEditorShell {...shared} initialForm={cardRecordToForm(record)} />
      case 'multiple_choice':
        return (
          <MultipleChoiceEditorShell
            {...shared}
            initialForm={cardRecordToMultipleChoiceForm(record)}
          />
        )
      case 'write_code':
        return <WriteCodeEditorShell {...shared} initialForm={cardRecordToWriteCodeForm(record)} />
      case 'ordering':
        return <OrderingEditorShell {...shared} initialForm={cardRecordToOrderingForm(record)} />
      case 'matching':
        return <MatchingEditorShell {...shared} initialForm={cardRecordToMatchingForm(record)} />
      case 'walkthrough':
        return (
          <WalkthroughEditorShell {...shared} initialForm={cardRecordToWalkthroughForm(record)} />
        )
    }
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
