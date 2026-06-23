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
