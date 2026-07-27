import { useMemo, useState } from 'react'
import type { Deck } from '@/types'
import { Button } from '@/components/ui/Button'
import { Field, fieldClass, selectClass } from '@/components/ui/Field'
import { buildDeckTree, flattenDeckTree, subtreeIds } from '@/domain/decks/tree'
import { DECK_LANGUAGES } from '@/domain/decks/languages'
import { useSaveDeck } from '@/hooks/useDecks'

// Edit a deck's name, description, and parent. The parent list excludes the
// deck itself and its descendants, so a move can never create a cycle.
// Setting the parent to "Top level" promotes it; picking another leaf deck
// as the parent is exactly how a new Collection gets created (see
// collectionTree.ts — Collections are derived from Deck.parentId, not
// authored directly).
export function DeckSettings({ deck, decks }: { deck: Deck; decks: Deck[] }) {
  const save = useSaveDeck()
  const [name, setName] = useState(deck.name)
  const [description, setDescription] = useState(deck.description ?? '')
  const [parentId, setParentId] = useState(deck.parentId ?? '')
  const [language, setLanguage] = useState(deck.language ?? '')

  const parentOptions = useMemo(() => {
    const forbidden = new Set(subtreeIds(decks, deck.id))
    return flattenDeckTree(buildDeckTree(decks)).filter((f) => !forbidden.has(f.deck.id))
  }, [decks, deck.id])

  const dirty =
    name.trim() !== deck.name ||
    description.trim() !== (deck.description ?? '') ||
    (parentId || undefined) !== deck.parentId ||
    (language || undefined) !== deck.language

  function handleSave() {
    if (!name.trim()) return
    save.mutate({
      ...deck,
      name: name.trim(),
      description: description.trim() || undefined,
      parentId: parentId || undefined,
      language: language || undefined,
    })
  }

  return (
    <div className="mb-4 space-y-4 rounded-itera-card border border-itera-border bg-itera-surface p-5">
      <Field label="Name">
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description (optional)">
        <textarea
          className={fieldClass}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this deck covers…"
        />
      </Field>
      <Field label="Parent deck">
        <select className={selectClass} value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Top level (no parent)</option>
          {parentOptions.map((f) => (
            <option key={f.deck.id} value={f.deck.id}>
              {f.path}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Language">
        <select className={selectClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">Unspecified</option>
          {DECK_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>
      <Button variant="primary" onClick={handleSave} disabled={!dirty || !name.trim() || save.isPending}>
        {save.isPending ? 'Saving…' : 'Save deck'}
      </Button>
    </div>
  )
}
