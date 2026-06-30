import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Card, CardType } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { buildDeckTree, flattenDeckTree } from '@/domain/decks/tree'
import type { NewCardInput } from '@/domain/cards/factory'
import { useCard, useCreateCard, useSaveCard } from '@/hooks/useCards'
import { useCreateDeck, useDecks } from '@/hooks/useDecks'
import { useDeleteDraft, useDraft } from '@/hooks/useDrafts'
import { seedContent } from '@/features/drafts/seedContent'
import { cardTypeMeta } from './cardTypeMeta'
import { getCardDefinition } from './registry'

const ALL_TYPES = Object.keys(cardTypeMeta) as CardType[]

// type + content travel together so a card type's Editor/isComplete never see a
// mismatched content shape (which would crash, e.g. mcq reading content.prompt).
interface EditorState {
  type: CardType
  content: Card['content']
}

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
// envelope (deck, tags); content editing is delegated to the type's Editor.
export function CardEditorPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const draftId = isEdit ? null : searchParams.get('draft')
  const presetDeck = isEdit ? null : searchParams.get('deck')

  const { data: existing, isLoading } = useCard(id)
  const { data: draft } = useDraft(draftId)
  const { data: decks } = useDecks()
  const createCard = useCreateCard()
  const saveCard = useSaveCard()
  const createDeck = useCreateDeck()
  const deleteDraft = useDeleteDraft()

  // For new cards we can seed immediately; edit cards hydrate once loaded (null
  // until then), so type/content are always a consistent pair.
  const [editor, setEditor] = useState<EditorState | null>(() =>
    isEdit
      ? null
      : { type: 'basic', content: getCardDefinition('basic').emptyContent() },
  )
  const [tags, setTags] = useState('')
  const [deckId, setDeckId] = useState('')

  // Decks flattened in tree order, each labeled with its full path (OS / Processes / …).
  const flatDecks = useMemo(
    () => flattenDeckTree(buildDeckTree(decks ?? [])),
    [decks],
  )

  // Hydrate from an existing card (edit mode).
  useEffect(() => {
    if (isEdit && existing) {
      setEditor({ type: existing.type, content: existing.content })
      setTags(existing.tags.join(', '))
      setDeckId(existing.deckId)
    }
  }, [existing, isEdit])

  // Prefill from a draft being converted (new mode).
  useEffect(() => {
    if (!isEdit && draft) {
      const t = draft.intendedType ?? 'basic'
      setEditor({ type: t, content: seedContent(t, draft.rawText) })
      if (draft.intendedDeckId) setDeckId(draft.intendedDeckId)
    }
  }, [draft, isEdit])

  // Default a new card's deck: the one we were opened from (?deck=), else the
  // first deck in tree order, once decks load.
  useEffect(() => {
    if (isEdit || deckId || !flatDecks.length) return
    const preset =
      presetDeck && flatDecks.some((f) => f.deck.id === presetDeck)
        ? presetDeck
        : flatDecks[0].deck.id
    setDeckId(preset)
  }, [flatDecks, isEdit, deckId, presetDeck])

  function changeType(t: CardType) {
    if (!editor || t === editor.type) return
    // Types have different content shapes, so switching starts fresh. Confirm
    // when editing so an existing card isn't wiped by an accidental change.
    if (
      isEdit &&
      !window.confirm("Changing the card type resets this card's content. Continue?")
    ) {
      return
    }
    setEditor({ type: t, content: getCardDefinition(t).emptyContent() })
  }

  function setContent(content: Card['content']) {
    setEditor((e) => (e ? { ...e, content } : e))
  }

  const saving = createCard.isPending || saveCard.isPending || createDeck.isPending

  async function handleSave() {
    if (!editor) return
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
        type: editor.type,
        content: editor.content,
      } as Card)
    } else {
      await createCard.mutateAsync({
        deckId: targetDeck,
        tags: parsedTags,
        type: editor.type,
        content: editor.content,
      } as NewCardInput)
      if (draftId) await deleteDraft.mutateAsync(draftId)
    }
    navigate(
      draftId ? '/drafts' : presetDeck ? `/decks/${presetDeck}` : '/browse',
    )
  }

  if (isEdit && isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }
  if (isEdit && !existing) {
    return (
      <div className="rounded-card border border-dashed border-border bg-panel p-8">
        <h2 className="text-base font-semibold">Card not found</h2>
        <Button className="mt-4" onClick={() => navigate('/browse')}>
          Back to Browse
        </Button>
      </div>
    )
  }
  if (!editor) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  const def = getCardDefinition(editor.type)
  const Editor = def.Editor
  const canSave = def.isComplete(editor.content)

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-5 text-lg font-semibold tracking-tight">
        {isEdit ? 'Edit card' : 'New card'}{' '}
        <span className="text-sm font-normal text-faint">
          · {cardTypeMeta[editor.type].label}
        </span>
      </h2>

      <div className="space-y-4 rounded-card border border-border bg-panel p-6">
        <Field label="Card type">
          <select
            className={selectClass}
            value={editor.type}
            onChange={(e) => changeType(e.target.value as CardType)}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {cardTypeMeta[t].label}
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="mt-1 text-xs text-faint">
              Changing the type resets this card's content.
            </p>
          )}
        </Field>

        <Editor content={editor.content} onChange={setContent} />

        {flatDecks.length > 0 ? (
          <Field label="Deck">
            <select
              className={selectClass}
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
            >
              {flatDecks.map((f) => (
                <option key={f.deck.id} value={f.deck.id}>
                  {f.path}
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
