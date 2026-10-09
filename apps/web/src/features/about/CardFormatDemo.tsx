import { useState } from 'react'
import type { InteractionType } from '@fliptap/core'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { INTERACTION_META } from '@/features/cards/shared/interactionTypeMeta'
import { ReviewSessionScreen } from '@/features/reviewV2/ReviewSessionScreen'
import { getInteractionDefinition } from '@/features/reviewV2/interactions/registry'
import { sampleCards } from './sampleCards'

const formats: { type: InteractionType; description: string }[] = [
  { type: 'recall', description: 'Think it through, then reveal the answer.' },
  { type: 'multiple_choice', description: 'Choose an answer and check your understanding.' },
  { type: 'write_code', description: 'Write code and compare with accepted solutions.' },
  { type: 'ordering', description: 'Put a process or sequence in the right order.' },
  { type: 'matching', description: 'Connect concepts with their definitions.' },
  { type: 'walkthrough', description: 'Work through a problem one step at a time.' },
]

export function CardFormatDemo() {
  const [selected, setSelected] = useState<InteractionType>('recall')
  const [attempt, setAttempt] = useState(0)
  const card = sampleCards[selected]

  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.6fr)] lg:gap-10">
      <div role="group" aria-label="Choose a sample card type" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {formats.map(({ type, description }) => {
          const { label, icon: Icon } = INTERACTION_META[type]
          return (
            <button key={type} type="button" aria-pressed={selected === type}
              aria-controls="about-card-preview" onClick={() => { setSelected(type); setAttempt(0) }}
              className={cn('flex min-h-11 items-center gap-2 rounded-fliptap-card border p-2 sm:items-start sm:gap-3 sm:p-3 text-left outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-fliptap-accent focus-visible:ring-offset-2',
                selected === type ? 'border-fliptap-selection-border bg-fliptap-selection-soft' : 'border-transparent hover:border-fliptap-border hover:bg-fliptap-surface')}>
              <span aria-hidden="true" className="grid h-8 w-8 flex-none sm:h-10 sm:w-10 place-items-center rounded-fliptap-control border border-fliptap-border bg-fliptap-surface text-fliptap-ink-brand"><Icon size={19} /></span>
              <span><span className="block text-sm font-semibold text-fliptap-ink-brand">{label}</span><span className="mt-1 hidden text-sm leading-6 sm:block text-fliptap-muted">{description}</span></span>
            </button>
          )
        })}
      </div>
      <div id="about-card-preview" role="region" aria-label={`${INTERACTION_META[selected].label} sample card`} className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-fliptap-muted">Sample card · Try it for yourself</p>
          <Button type="button" variant="ghost" className="min-h-11 px-3" onClick={() => setAttempt(value => value + 1)}>Try again</Button>
        </div>
        <ReviewSessionScreen key={`${selected}-${attempt}`} card={card}
          definition={getInteractionDefinition(selected)} current={1} total={1}
          onExit={() => {}} schedulingBefore={card.scheduling} hideTopBar hideRating enableShortcuts={false} />
        <p className="mt-4 text-xs leading-5 text-fliptap-muted">Just a preview. Your cards, review history and schedule stay unchanged.</p>
      </div>
    </div>
  )
}
