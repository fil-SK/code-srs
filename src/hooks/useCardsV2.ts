import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ID } from '@/types'
import type { CardV2Query } from '@/data/repository'
import { getRepository } from '@/data'
import type { CardV2Record } from '@/types/cardV2'
import type { RecallFormState } from '@/domain/cardsV2/recallForm'
import { saveRecallCard, type SaveRecallCardTarget } from '@/domain/cardsV2/saveRecallCard'
import type { MultipleChoiceFormState } from '@/domain/cardsV2/multipleChoiceForm'
import {
  saveMultipleChoiceCard,
  type SaveMultipleChoiceCardTarget,
} from '@/domain/cardsV2/saveMultipleChoiceCard'
import type { WriteCodeFormState } from '@/domain/cardsV2/writeCodeForm'
import { saveWriteCodeCard, type SaveWriteCodeCardTarget } from '@/domain/cardsV2/saveWriteCodeCard'
import type { OrderingFormState } from '@/domain/cardsV2/orderingForm'
import { saveOrderingCard, type SaveOrderingCardTarget } from '@/domain/cardsV2/saveOrderingCard'
import type { MatchingFormState } from '@/domain/cardsV2/matchingForm'
import { saveMatchingCard, type SaveMatchingCardTarget } from '@/domain/cardsV2/saveMatchingCard'
import { qk } from './queryKeys'

export type { SaveRecallCardTarget } from '@/domain/cardsV2/saveRecallCard'
export type { SaveMultipleChoiceCardTarget } from '@/domain/cardsV2/saveMultipleChoiceCard'
export type { SaveWriteCodeCardTarget } from '@/domain/cardsV2/saveWriteCodeCard'
export type { SaveOrderingCardTarget } from '@/domain/cardsV2/saveOrderingCard'
export type { SaveMatchingCardTarget } from '@/domain/cardsV2/saveMatchingCard'

const repo = getRepository()

export function useCardV2(id: ID | undefined) {
  return useQuery({
    queryKey: qk.cardV2(id ?? ''),
    // See the matching comment in useCards.ts's useCard — `null`, not
    // `undefined`, is the valid "not found" value for TanStack Query v5.
    queryFn: async () => (await repo.cardsV2.getById(id as ID)) ?? null,
    enabled: !!id,
  })
}

export function useSearchCardsV2(query: CardV2Query) {
  return useQuery({
    queryKey: qk.cardsV2Search(query),
    queryFn: () => repo.cardsV2.search(query),
  })
}

export function useCreateCardV2() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: CardV2Record) => {
      await repo.cardsV2.put(record)
      return record
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cardsV2 }),
  })
}

export function useSaveCardV2() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: CardV2Record) => {
      const saved = { ...record, updatedAt: Date.now() }
      await repo.cardsV2.put(saved)
      return saved
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: qk.cardsV2 })
      qc.invalidateQueries({ queryKey: qk.cardV2(saved.id) })
    },
  })
}

export function useDeleteCardV2() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: ID) => repo.cardsV2.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cardsV2 }),
  })
}

// Thin useMutation wrapper around the pure saveRecallCard (see
// src/domain/cardsV2/saveRecallCard.ts for the actual save/migrate logic,
// which is unit-tested directly against a repository).
export function useSaveRecallCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      form,
      target,
    }: {
      form: RecallFormState
      target: SaveRecallCardTarget
    }) => saveRecallCard(repo, form, target),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: qk.cardsV2 })
      qc.invalidateQueries({ queryKey: qk.cardV2(record.id) })
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.card(record.id) })
    },
  })
}

// Thin useMutation wrapper around the pure saveMultipleChoiceCard (see
// src/domain/cardsV2/saveMultipleChoiceCard.ts), mirroring useSaveRecallCard.
export function useSaveMultipleChoiceCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      form,
      target,
    }: {
      form: MultipleChoiceFormState
      target: SaveMultipleChoiceCardTarget
    }) => saveMultipleChoiceCard(repo, form, target),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: qk.cardsV2 })
      qc.invalidateQueries({ queryKey: qk.cardV2(record.id) })
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.card(record.id) })
    },
  })
}

// Thin useMutation wrapper around the pure saveWriteCodeCard (see
// src/domain/cardsV2/saveWriteCodeCard.ts), mirroring useSaveMultipleChoiceCard.
export function useSaveWriteCodeCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      form,
      target,
    }: {
      form: WriteCodeFormState
      target: SaveWriteCodeCardTarget
    }) => saveWriteCodeCard(repo, form, target),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: qk.cardsV2 })
      qc.invalidateQueries({ queryKey: qk.cardV2(record.id) })
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.card(record.id) })
    },
  })
}

// Thin useMutation wrapper around the pure saveOrderingCard (see
// src/domain/cardsV2/saveOrderingCard.ts), mirroring useSaveWriteCodeCard.
export function useSaveOrderingCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      form,
      target,
    }: {
      form: OrderingFormState
      target: SaveOrderingCardTarget
    }) => saveOrderingCard(repo, form, target),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: qk.cardsV2 })
      qc.invalidateQueries({ queryKey: qk.cardV2(record.id) })
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.card(record.id) })
    },
  })
}

// Thin useMutation wrapper around the pure saveMatchingCard (see
// src/domain/cardsV2/saveMatchingCard.ts), mirroring useSaveOrderingCard.
export function useSaveMatchingCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      form,
      target,
    }: {
      form: MatchingFormState
      target: SaveMatchingCardTarget
    }) => saveMatchingCard(repo, form, target),
    onSuccess: (record) => {
      qc.invalidateQueries({ queryKey: qk.cardsV2 })
      qc.invalidateQueries({ queryKey: qk.cardV2(record.id) })
      qc.invalidateQueries({ queryKey: qk.cards })
      qc.invalidateQueries({ queryKey: qk.card(record.id) })
    },
  })
}
