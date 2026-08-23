import { LibraryBig, Tags } from 'lucide-react'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import type { FlatDeck } from '@/domain/decks/tree'
import { cn } from '@/lib/cn'

export function CardOrganizeFields({
  deckId,
  tags,
  flatDecks,
  onDeckChange,
  onTagsChange,
}: {
  deckId: string
  tags: string
  flatDecks: FlatDeck[]
  onDeckChange: (deckId: string) => void
  onTagsChange: (tags: string) => void
}) {
  return (
    <section className="relative p-5 before:absolute before:left-5 before:right-5 before:top-0 before:h-px before:bg-itera-border sm:p-6 sm:before:left-6 sm:before:right-6">
      <h2 className="mb-4 text-sm font-semibold text-itera-ink-brand">3. Organize</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deck">
          <div className="relative">
            <LibraryBig
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-itera-muted"
              aria-hidden="true"
            />
            <select
              className={cn(selectClass, 'h-[42px] pl-10')}
              value={deckId}
              onChange={(event) => onDeckChange(event.target.value)}
            >
              {flatDecks.map((flatDeck) => (
                <option key={flatDeck.deck.id} value={flatDeck.deck.id}>
                  {flatDeck.path}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1.5 text-xs text-itera-muted">Choose where this card lives.</p>
        </Field>

        <Field label="Tags">
          <div className="relative">
            <Tags
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-itera-muted"
              aria-hidden="true"
            />
            <input
              className={cn(fieldClass, 'h-[42px] pl-10')}
              value={tags}
              onChange={(event) => onTagsChange(event.target.value)}
              placeholder="ssa, compilers"
            />
          </div>
          <p className="mt-1.5 text-xs text-itera-muted">Use tags to find and filter cards later.</p>
        </Field>
      </div>
    </section>
  )
}
