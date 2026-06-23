import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Card, CardType } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass } from '@/components/ui/Field'
import type { NewCardInput } from '@/domain/cards/factory'
import { useCard, useCreateCard, useSaveCard } from '@/hooks/useCards'
import { useCreateDeck, useDecks } from '@/hooks/useDecks'
import { cardTypeMeta } from './cardTypeMeta'
import { getCardDefinition } from './registry'

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  )
}

// Edits/creates a card via the registry's per-type Editor. The page owns the
// envelope (deck, tags, type); content editing is delegated to the type.
// New cards are Basic for now — a type picker arrives later in M3.
export function CardEditorPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading } = useCard(id)
  const { data: decks } = useDecks()
  const createCard = useCreateCard()
  const saveCard = useSaveCard()
  const createDeck = useCreateDeck()

  const type: CardType = existing?.type ?? 'basic'
  const def = getCardDefinition(type)

  const [content, setContent] = useState<Card['content'] | null>(() =>
    isEdit ? null : (def?.emptyContent() ?? null),
  )
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (isEdit && existing && def) {
      setContent(existing.content)
      setTags(existing.tags.join(', '))
    }
  }, [existing, def, isEdit])

  const unsupported = isEdit && existing && !def
  const canSave = !!def && !!content && def.isComplete(content)
  const saving = createCard.isPending || saveCard.isPending || createDeck.isPending

  async function handleSave() {
    if (!def || !content) return
    const parsedTags = parseTags(tags)

    if (isEdit && existing) {
      await saveCard.mutateAsync({
        ...existing,
        tags: parsedTags,
        content,
      } as Card)
    } else {
      let deckId = decks?.[0]?.id
      if (!deckId) {
        const deck = await createDeck.mutateAsync({
          name: 'Inbox',
          description: 'Default deck for new cards',
        })
        deckId = deck.id
      }
      await createCard.mutateAsync({
        deckId,
        tags: parsedTags,
        type,
        content,
      } as NewCardInput)
    }
    navigate('/browse')
  }

  if (isEdit && isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (unsupported) {
    return (
      <div className="rounded-card border border-dashed border-border bg-panel p-8">
        <h2 className="text-base font-semibold">
          Editing this card type comes in a later M3 checkpoint
        </h2>
        <p className="mt-2 text-sm text-muted">
          This is a <code className="font-mono text-accent">{existing.type}</code>{' '}
          card; its editor is not implemented yet.
        </p>
        <Button className="mt-4" onClick={() => navigate('/browse')}>
          Back to Browse
        </Button>
      </div>
    )
  }

  if (!def || !content) return null

  const Editor = def.Editor

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-5 text-lg font-semibold tracking-tight">
        {isEdit ? 'Edit card' : 'New card'}{' '}
        <span className="text-sm font-normal text-faint">
          · {cardTypeMeta[type].label}
        </span>
      </h2>

      <div className="space-y-4 rounded-card border border-border bg-panel p-6">
        <Editor content={content} onChange={setContent} />

        <Field label="Tags (comma-separated)">
          <input
            className={fieldClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ssa, compilers"
          />
        </Field>

        <div className="flex gap-2.5 pt-1">
          <Button variant="primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create card'}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/browse')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
