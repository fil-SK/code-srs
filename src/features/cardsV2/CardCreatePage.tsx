import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import type { CardV2Record, InteractionType } from '@/types/cardV2'
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
  // Recall is the reference's default interaction and the most common card.
  // Keeping one type selected also makes create a complete, continuous form
  // on first paint instead of an empty chooser-only state.
  const [selectedType, setSelectedType] = useState<InteractionType>('recall')

  const backTo = deckId ? `/decks/${deckId}` : '/decks'
  const onSaved = (record: CardV2Record) => navigate(`/decks/${record.deckId}`)

  function renderEditorShell() {
    switch (selectedType) {
      case 'recall':
        return (
          <RecallEditorShell
            mode="create"
            initialForm={emptyRecallForm(deckId)}
            target={{ kind: 'new' }}
            backTo={backTo}
            onSaved={onSaved}
          />
        )
      case 'multiple_choice':
        return (
          <MultipleChoiceEditorShell
            mode="create"
            initialForm={emptyMultipleChoiceForm(deckId)}
            target={{ kind: 'new' }}
            backTo={backTo}
            onSaved={onSaved}
          />
        )
      case 'write_code':
        return (
          <WriteCodeEditorShell
            mode="create"
            initialForm={emptyWriteCodeForm(deckId)}
            target={{ kind: 'new' }}
            backTo={backTo}
            onSaved={onSaved}
          />
        )
      case 'ordering':
        return (
          <OrderingEditorShell
            mode="create"
            initialForm={emptyOrderingForm(deckId)}
            target={{ kind: 'new' }}
            backTo={backTo}
            onSaved={onSaved}
          />
        )
      case 'matching':
        return (
          <MatchingEditorShell
            mode="create"
            initialForm={emptyMatchingForm(deckId)}
            target={{ kind: 'new' }}
            backTo={backTo}
            onSaved={onSaved}
          />
        )
      case 'walkthrough':
        return (
          <WalkthroughEditorShell
            mode="create"
            initialForm={emptyWalkthroughForm(deckId)}
            target={{ kind: 'new' }}
            backTo={backTo}
            onSaved={onSaved}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="card-create-panel mx-auto w-full pb-8">
      <header className="mb-5 flex min-h-10 items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-2 text-sm font-medium text-itera-ink transition-colors hover:text-itera-accent"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Cancel
        </button>
        <span className="h-8 w-px bg-itera-border" aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight text-itera-ink-brand">New card</h1>
      </header>

      <div className="overflow-hidden rounded-itera-card border border-itera-border bg-itera-surface shadow-[0_2px_10px_rgba(23,32,51,0.04)]">
        <section className="relative p-5 after:absolute after:bottom-0 after:left-5 after:right-5 after:h-px after:bg-itera-border sm:p-6 sm:after:left-6 sm:after:right-6">
          <CardTypeChooser selected={selectedType} onSelect={setSelectedType} />
        </section>
        <div key={selectedType} className="reveal-in">
          {renderEditorShell()}
        </div>
      </div>
    </div>
  )
}
