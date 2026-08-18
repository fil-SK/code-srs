import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Card, ID } from '@/types'
import type { CardQuery, DueQuery } from '@/data/repository'
import { getRepository } from '@/data'
import type { RecallFormState } from '@/domain/cards/recallForm'
import { saveRecallCard, type SaveRecallCardTarget } from '@/domain/cards/saveRecallCard'
import type { MultipleChoiceFormState } from '@/domain/cards/multipleChoiceForm'
import {
  saveMultipleChoiceCard,
  type SaveMultipleChoiceCardTarget,
} from '@/domain/cards/saveMultipleChoiceCard'
import type { WriteCodeFormState } from '@/domain/cards/writeCodeForm'
import { saveWriteCodeCard, type SaveWriteCodeCardTarget } from '@/domain/cards/saveWriteCodeCard'
import type { OrderingFormState } from '@/domain/cards/orderingForm'
import { saveOrderingCard, type SaveOrderingCardTarget } from '@/domain/cards/saveOrderingCard'
import type { MatchingFormState } from '@/domain/cards/matchingForm'
import { saveMatchingCard, type SaveMatchingCardTarget } from '@/domain/cards/saveMatchingCard'
import type { WalkthroughFormState } from '@/domain/cards/walkthroughForm'
import {
  saveWalkthroughCard,
  type SaveWalkthroughCardTarget,
} from '@/domain/cards/saveWalkthroughCard'
import { qk } from './queryKeys'

export type { SaveRecallCardTarget } from '@/domain/cards/saveRecallCard'
export type { SaveMultipleChoiceCardTarget } from '@/domain/cards/saveMultipleChoiceCard'
export type { SaveWriteCodeCardTarget } from '@/domain/cards/saveWriteCodeCard'
export type { SaveOrderingCardTarget } from '@/domain/cards/saveOrderingCard'
export type { SaveMatchingCardTarget } from '@/domain/cards/saveMatchingCard'
export type { SaveWalkthroughCardTarget } from '@/domain/cards/saveWalkthroughCard'

const repo = getRepository()

export function useCard(id: ID | undefined) {
  return useQuery({
    queryKey: qk.card(id ?? ''),
    // TanStack Query v5 treats a query function returning `undefined` as a
    // bug (logs "Query data cannot be undefined") — `null` is the correct
    // "not found" value.
    queryFn: async () => (await repo.cards.getById(id as ID)) ?? null,
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

// Takes an already-built record (see domain/cards/factory's createCard) so
// callers like CardTable's Duplicate can derive one from an existing card.
export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (card: Card) => {
      await repo.cards.put(card)
      return card
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cards }),
  })
}

// Also used to toggle `suspended` and to move a card between decks
// (see library/shared/CardTable).
export function useSaveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (card: Card) => {
      const saved = { ...card, updatedAt: Date.now() }
      await repo.cards.put(saved)
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

// ---- Per-interaction save hooks --------------------------------------------
// Thin useMutation wrappers around the pure save*Card modules in
// src/domain/cards/, each unit-tested directly against a repository.

function useSaveCardMutation<TForm, TTarget>(
  save: (form: TForm, target: TTarget) => Promise<Card>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ form, target }: { form: TForm; target: TTarget }) => save(form, target),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.card(record.id) })
    },
  })
}

export function useSaveRecallCard() {
  return useSaveCardMutation<RecallFormState, SaveRecallCardTarget>((form, target) =>
    saveRecallCard(repo, form, target),
  )
}

export function useSaveMultipleChoiceCard() {
  return useSaveCardMutation<MultipleChoiceFormState, SaveMultipleChoiceCardTarget>(
    (form, target) => saveMultipleChoiceCard(repo, form, target),
  )
}

export function useSaveWriteCodeCard() {
  return useSaveCardMutation<WriteCodeFormState, SaveWriteCodeCardTarget>((form, target) =>
    saveWriteCodeCard(repo, form, target),
  )
}

export function useSaveOrderingCard() {
  return useSaveCardMutation<OrderingFormState, SaveOrderingCardTarget>((form, target) =>
    saveOrderingCard(repo, form, target),
  )
}

export function useSaveMatchingCard() {
  return useSaveCardMutation<MatchingFormState, SaveMatchingCardTarget>((form, target) =>
    saveMatchingCard(repo, form, target),
  )
}

export function useSaveWalkthroughCard() {
  return useSaveCardMutation<WalkthroughFormState, SaveWalkthroughCardTarget>((form, target) =>
    saveWalkthroughCard(repo, form, target),
  )
}
