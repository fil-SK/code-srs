import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/cn'
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
  const [selectedType, setSelectedType] = useState<InteractionType | null>(null)

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
    <div>
      {/* Sticky so "Choose interaction" stays put as the editor below grows —
          it never gets pushed around once a type is picked. Offset by the
          AppShell header's own sticky height (77px) so the two stack rather
          than overlap; the -mx/px pair cancels <main>'s side padding so the
          background spans edge-to-edge like that header does. */}
      <div className="sticky top-[77px] z-[5] -mx-4 bg-bg px-4 pb-4 pt-1 md:-mx-6 md:px-6">
        <div className="mx-auto max-w-3xl">
          {/* invisible (not unmounted) once a type is picked — CardEditorShell
              shows its own "Back to deck" below, but this keeps the same
              space reserved above the chooser so it never shifts vertically. */}
          <button
            type="button"
            onClick={() => navigate(backTo)}
            tabIndex={selectedType ? -1 : 0}
            className={cn(
              'mb-4 text-xs text-itera-muted hover:text-itera-ink',
              selectedType && 'invisible',
            )}
          >
            ← Back to deck
          </button>
          <CardTypeChooser selected={selectedType} onSelect={setSelectedType} />
        </div>
      </div>
      {selectedType && (
        <div key={selectedType} className="reveal-in mt-2">
          {renderEditorShell()}
        </div>
      )}
    </div>
  )
}
