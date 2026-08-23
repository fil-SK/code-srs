import type { FlatDeck } from '@/domain/decks/tree'
import type { InteractionType } from '@/types/card'
import { interactionLabel } from './interactionTypeMeta'

// "{Interaction} · {Deck path}" shown under the CardEditorShell title —
// identical across all six *EditorShell.tsx files, so it's a shared pure
// helper rather than six copies (unlike the shell layout itself, this has
// no per-type variation to justify duplicating).
export function editorSubtitle(type: InteractionType, flatDecks: FlatDeck[], deckId: string): string {
  const deckPath = flatDecks.find((f) => f.deck.id === deckId)?.path ?? 'Unfiled'
  return `${interactionLabel(type)} · ${deckPath}`
}
