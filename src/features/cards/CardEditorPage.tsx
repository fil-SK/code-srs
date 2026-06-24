import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Card, CardType } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import type { NewCardInput } from '@/domain/cards/factory'
import { useCard, useCreateCard, useSaveCard } from '@/hooks/useCards'
import { useCreateDeck, useDecks } from '@/hooks/useDecks'
import { useDeleteDraft, useDraft } from '@/hooks/useDrafts'
import { seedContent } from '@/features/drafts/seedContent'
import { cardTypeMeta } from './cardTypeMeta'
import { getCardDefinition } from './registry'

const ALL_TYPES = Object.keys(cardTypeMeta) as CardType[]

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

  const [searchParams] = useSearchParams()
  const draftId = isEdit ? null : searchParams.get('draft')

  const { data: existing, isLoading } = useCard(id)
  const { data: draft } = useDraft(draftId)
  const { data: decks } = useDecks()
  const createCard = useCreateCard()
  const saveCard = useSaveCard()
  const createDeck = useCreateDeck()
  const deleteDraft = useDeleteDraft()

  const [newType, setNewType] = useState<CardType>('basic')
  const type: CardType = existing?.type ?? newType
  const def = getCardDefinition(type)

  const [content, setContent] = useState<Card['content']>(() =>
    getCardDefinition('basic').emptyContent(),
  )
  const [tags, setTags] = useState('')
  const [deckId, setDeckId] = useState('')
  // Free text seeded into the primary field when converting a draft.
  const [seedText, setSeedText] = useState('')

  useEffect(() => {
    if (isEdit && existing) {
      setContent(existing.content)
      setTags(existing.tags.join(', '))
      setDeckId(existing.deckId)
    }
  }, [existing, isEdit])

  // Prefill from a draft being converted.
  useEffect(() => {
    if (!isEdit && draft) {
      setSeedText(draft.rawText)
      setNewType(draft.intendedType ?? 'basic')
      if (draft.intendedDeckId) setDeckId(draft.intendedDeckId)
    }
  }, [draft, isEdit])

  // Default a new card to the first deck once decks load.
  useEffect(() => {
    if (!isEdit && !deckId && decks?.length) setDeckId(decks[0].id)
  }, [decks, isEdit, deckId])

  // Switching type for a new card resets content (seeding draft text if present).
  useEffect(() => {
    if (!isEdit) setContent(seedContent(newType, seedText))
  }, [newType, isEdit, seedText])

  const canSave = def.isComplete(content)
  const saving = createCard.isPending || saveCard.isPending || createDeck.isPending

  async function handleSave() {
    const parsedTags = parseTags(tags)

    // Ensure a target deck exists (first card with no decks → auto Inbox).
    let targetDeck = deckId
    if (!targetDeck) {
      const deck = await createDeck.mutateAsync({
        name: 'Inbox',
        description: 'Default deck for new cards',
      })
      targetDeck = deck.id
    }

    if (isEdit && existing) {
      await saveCard.mutateAsync({
        ...existing,
        deckId: targetDeck,
        tags: parsedTags,
        content,
      } as Card)
    } else {
      await createCard.mutateAsync({
        deckId: targetDeck,
        tags: parsedTags,
        type,
        content,
      } as NewCardInput)
      if (draftId) await deleteDraft.mutateAsync(draftId)
    }
    navigate(draftId ? '/drafts' : '/browse')
  }

  if (isEdit && isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

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
        {!isEdit && (
          <Field label="Card type">
            <select
              className={selectClass}
              value={newType}
              onChange={(e) => setNewType(e.target.value as CardType)}
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {cardTypeMeta[t].label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Editor content={content} onChange={setContent} />

        {decks && decks.length > 0 ? (
          <Field label="Deck">
            <select
              className={selectClass}
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <p className="text-xs text-muted">
            No decks yet — an “Inbox” deck will be created on save.
          </p>
        )}

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
