import { useEffect, useState } from 'react'
import type { CardV2, RecallInteraction } from '@/types/cardV2'
import { RichText } from '@/components/text/RichText'
import { FlashcardSurface } from '@/features/reviewV2/components/FlashcardSurface'
import { InteractionLabel } from '@/features/reviewV2/components/InteractionLabel'
import { TipPanel } from '@/features/reviewV2/components/TipPanel'
import { ExplanationPanel } from '@/features/reviewV2/components/ExplanationPanel'
import {
  RatingControls,
  type PreviewRating,
} from '@/features/reviewV2/components/RatingControls'

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('button, [role="button"], input, textarea, select'))
  )
}

// The interactive Recall demo: owns reveal/rating state and keyboard
// handling. Kept separate from RecallPreviewPage so it can be unit-tested
// directly with fixture data, with no router/PreviewShell involved.
export function RecallCardDemo({
  card,
}: {
  card: CardV2 & { interaction: RecallInteraction }
}) {
  const [revealed, setRevealed] = useState(false)
  const [rated, setRated] = useState<PreviewRating | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return // ignore key-repeat from a held-down key

      if (e.key === ' ' || e.code === 'Space') {
        // A focused control (a rating button, say) handles its own Space via
        // native semantics — don't also flip the card underneath it.
        if (isInteractiveTarget(e.target)) return
        e.preventDefault() // Space must never scroll the page
        if (!revealed) setRevealed(true)
        return
      }

      if (revealed && rated == null && ['1', '2', '3', '4'].includes(e.key)) {
        setRated(Number(e.key) as PreviewRating)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [revealed, rated])

  function flip() {
    if (!revealed) setRevealed(true)
  }

  function rate(rating: PreviewRating) {
    if (rated == null) setRated(rating)
  }

  return (
    <div>
      <FlashcardSurface
        flipped={revealed}
        onFlip={flip}
        ariaLabel={
          revealed
            ? 'Recall card, answer showing'
            : 'Recall card, click or press Space to reveal the answer'
        }
        front={
          <>
            <div>
              <InteractionLabel text="Recall" />
              <RichText
                text={card.prompt.value}
                className="mt-3 text-lg font-semibold leading-snug text-itera-ink-brand"
              />
            </div>
            <div className="text-center text-xs font-medium text-itera-muted">
              Click the card or press Space to reveal
            </div>
          </>
        }
        back={
          <div>
            <InteractionLabel text="Recall" />
            <RichText
              text={card.interaction.answer.value}
              className="mt-3 text-base leading-relaxed text-itera-ink"
            />
          </div>
        }
      />

      {!revealed && <TipPanel text={card.tip?.value} />}

      {revealed && (
        <>
          <ExplanationPanel text={card.explanation?.value} />
          <RatingControls selected={rated} onRate={rate} />
        </>
      )}
    </div>
  )
}
