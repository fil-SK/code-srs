import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Card, ID } from '@/types'
import type { CardQuery, DueQuery } from '@/data/repository'
import { getRepository } from '@/data'
import { createCard, type NewCardInput } from '@/domain/cards/factory'
import { qk } from './queryKeys'

const repo = getRepository()

export function useCard(id: ID | undefined) {
  return useQuery({
    queryKey: qk.card(id ?? ''),
    queryFn: () => repo.cards.getById(id as ID),
    enabled: !!id,
  })
}

export function useDueCards(query: DueQuery) {
  return useQuery({
    queryKey: qk.cardsDue(query),
    queryFn: () => repo.cards.getDue(query),
  })
}

export function useSearchCards(query: CardQuery) {
  return useQuery({
    queryKey: qk.cardsSearch(query),
    queryFn: () => repo.cards.search(query),
  })
}

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewCardInput) => {
      const card = createCard(input)
      await repo.cards.put(card)
      return card
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cards }),
  })
}

export function useSaveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (card: Card) => {
      await repo.cards.put({ ...card, updatedAt: Date.now() })
    },
    onSuccess: (_data, card) => {
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.card(card.id) })
    },
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: ID) => repo.cards.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cards }),
  })
}

// Move a card to another deck. Drops its manual order so it lands in creation
// order within the target deck (the user can reorder there afterwards).
export function useMoveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ card, deckId }: { card: Card; deckId: ID }) => {
      const { order: _order, ...rest } = card
      await repo.cards.put({ ...rest, deckId, updatedAt: Date.now() })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cards }),
  })
}

// Persist a new manual order for a list of cards (e.g. one deck's cards after a
// drag). Assigns sequential positions and preserves every other field,
// including updatedAt, so reordering is not treated as an edit.
export function useReorderCards() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cards: Card[]) => {
      const ordered = cards.map((c, i) => ({ ...c, order: i }))
      await repo.cards.bulkPut(ordered)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cards }),
  })
}
