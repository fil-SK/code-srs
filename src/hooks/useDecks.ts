import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Deck, ID } from '@/types'
import { getRepository } from '@/data'
import { newId } from '@/lib/id'
import { qk } from './queryKeys'

const repo = getRepository()

export function useDecks() {
  return useQuery({ queryKey: qk.decks, queryFn: () => repo.decks.getAll() })
}

export interface NewDeckInput {
  name: string
  description?: string
  parentId?: ID
}

export function useCreateDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewDeckInput) => {
      const now = Date.now()
      const deck: Deck = { id: newId(), createdAt: now, updatedAt: now, ...input }
      await repo.decks.put(deck)
      return deck
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decks }),
  })
}

export function useSaveDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (deck: Deck) => {
      await repo.decks.put({ ...deck, updatedAt: Date.now() })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decks }),
  })
}

export function useDeleteDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: ID) => repo.decks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.decks }),
  })
}
