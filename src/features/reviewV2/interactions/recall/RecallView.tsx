import { RichText } from '@/components/text/RichText'
import { FlashcardSurface } from '../../components/FlashcardSurface'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'

export function RecallView({
  card,
  phase,
  onPrimaryAction,
}: InteractionViewProps<'recall'>) {
  const flipped = phase.kind !== 'presenting'

  return (
    <FlashcardSurface
      flipped={flipped}
      onFlip={onPrimaryAction}
      ariaLabel={
        flipped
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
  )
}
