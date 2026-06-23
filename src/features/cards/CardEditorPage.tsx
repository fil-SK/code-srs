import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useCard, useCreateCard, useSaveCard } from '@/hooks/useCards'
import { useCreateDeck, useDecks } from '@/hooks/useDecks'

const fieldClass =
  'w-full rounded-[9px] border border-border bg-code-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent'

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

// Basic Q&A editor. M3 replaces this with a type-aware editor registry; for now
// new cards are Basic, and editing a non-Basic card shows a notice.
export function CardEditorPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: existing, isLoading } = useCard(id)
  const { data: decks } = useDecks()
  const createCard = useCreateCard()
  const saveCard = useSaveCard()
  const createDeck = useCreateDeck()

  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (existing && existing.type === 'basic') {
      setFront(existing.content.front)
      setBack(existing.content.back)
      setTags(existing.tags.join(', '))
    }
  }, [existing])

  const unsupported = isEdit && existing && existing.type !== 'basic'
  const canSave = front.trim().length > 0 && back.trim().length > 0
  const saving = createCard.isPending || saveCard.isPending || createDeck.isPending

  async function handleSave() {
    const parsedTags = parseTags(tags)

    if (isEdit && existing && existing.type === 'basic') {
      await saveCard.mutateAsync({
        ...existing,
        tags: parsedTags,
        content: { front, back },
      })
    } else {
      // Ensure a deck exists for the card to live in (proper deck mgmt in M4).
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
        type: 'basic',
        content: { front, back },
      })
    }
    navigate('/browse')
  }

  if (isEdit && isLoading) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  if (unsupported) {
    return (
      <div className="rounded-card border border-dashed border-border bg-panel p-8">
        <h2 className="text-base font-semibold">Editing this card type comes in M3</h2>
        <p className="mt-2 text-sm text-muted">
          This is a <code className="font-mono text-accent">{existing.type}</code>{' '}
          card. Only Basic cards are editable so far.
        </p>
        <Button className="mt-4" onClick={() => navigate('/browse')}>
          Back to Browse
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-5 text-lg font-semibold tracking-tight">
        {isEdit ? 'Edit card' : 'New card'}{' '}
        <span className="text-sm font-normal text-faint">· Basic Q&amp;A</span>
      </h2>

      <div className="space-y-4 rounded-card border border-border bg-panel p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Front (question)
          </span>
          <textarea
            className={fieldClass}
            rows={3}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="What is SSA form?"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Back (answer)
          </span>
          <textarea
            className={fieldClass}
            rows={5}
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Static Single Assignment: each variable is assigned exactly once…"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Tags (comma-separated)
          </span>
          <input
            className={fieldClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="ssa, compilers"
          />
        </label>

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
