import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
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
import { STICKY_TOP_VAR } from './CardEditorShell'
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

  // The sticky chooser bar's own height, published as STICKY_TOP_VAR so the
  // editor shell's (also sticky) action header parks directly beneath it.
  // Two sibling sticky elements don't auto-stack - each resolves its `top`
  // against the scrollport independently (D81) - so the offset has to be
  // measured rather than hardcoded, since the chooser's grid reflows from six
  // columns to two across breakpoints (180px wide, 344px on a phone).
  const chooserRef = useRef<HTMLDivElement>(null)
  const [chooserHeight, setChooserHeight] = useState(0)

  useLayoutEffect(() => {
    const el = chooserRef.current
    if (!el) return
    const measure = () => setChooserHeight(el.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
    <div style={{ [STICKY_TOP_VAR]: `${chooserHeight}px` } as CSSProperties}>
      {/* Sticky so "Choose interaction" stays put as the editor below grows —
          it never gets pushed around once a type is picked. top-0 (not offset
          below TopNav) because the shared AppShell's TopNav is not itself
          sticky/fixed — it scrolls away with the page like Today's/Library's
          headers, so once it's scrolled past, this is the first thing at the
          top of the viewport. The -mx/px pair cancels <main>'s side padding
          so the background spans edge-to-edge. */}
      <div ref={chooserRef} className="sticky top-0 z-[5] -mx-4 bg-bg px-4 pb-4 pt-1 md:-mx-6 md:px-6">
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
        /* no mt-* here: the editor header carries its own pt-2, which doubles
           as the breathing room under the chooser while it is stuck to it. */
        <div key={selectedType} className="reveal-in">
          {renderEditorShell()}
        </div>
      )}
    </div>
  )
}
