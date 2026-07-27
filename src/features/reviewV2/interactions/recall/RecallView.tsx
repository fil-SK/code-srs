import { Copy } from 'lucide-react'
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
          <div className="flex flex-col items-center gap-4 text-center">
            <InteractionLabel type="recall" />
            <RichText
              text={card.prompt.value}
              className="text-2xl font-bold leading-snug text-itera-ink-brand sm:text-3xl"
            />
          </div>
          <div className="flex flex-col items-center gap-2 text-itera-muted">
            <Copy size={20} />
            <span className="text-sm font-medium">
              Click the card or press Space to flip
            </span>
          </div>
        </>
      }
      back={
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <InteractionLabel type="recall" />
          </div>
          <RichText
            text={card.interaction.answer.value}
            className="text-lg font-semibold leading-relaxed text-itera-ink-brand"
          />
        </div>
      }
    />
  )
}
