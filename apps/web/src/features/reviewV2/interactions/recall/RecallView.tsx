import { RichText } from '@/components/text/RichText'
import { CardPrompt } from '../../components/CardPrompt'
import { FlashcardSurface } from '../../components/FlashcardSurface'
import { FlipCueIcon } from '../../components/FlipCueIcon'
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
        <div className="grid flex-1 grid-rows-[3.5rem_minmax(0,1fr)_3.5rem] text-center">
          <div className="flex items-start justify-center">
            <InteractionLabel type="recall" />
          </div>
          <div className="flex items-center justify-center py-4">
            <CardPrompt text={card.prompt.value} />
          </div>
          <div className="flex flex-col items-center justify-end gap-1.5 text-itera-muted">
            <FlipCueIcon />
            <span className="text-sm font-medium">
              Click the card or press Space to flip
            </span>
          </div>
        </div>
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
