import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CardType, CodeBlock, Draft, ID } from '@/types'
import { getRepository } from '@/data'
import { newId } from '@/lib/id'
import { qk } from './queryKeys'

const repo = getRepository()

export function useDrafts() {
  return useQuery({
    queryKey: qk.drafts,
    queryFn: async () => {
      const all = await repo.drafts.getAll()
      return all.sort((a, b) => b.createdAt - a.createdAt) // newest first
    },
  })
}

export function useDraft(id: ID | null) {
  return useQuery({
    queryKey: qk.draft(id ?? ''),
    queryFn: () => repo.drafts.getById(id as ID),
    enabled: !!id,
  })
}

export interface NewDraftInput {
  rawText: string
  code?: CodeBlock
  intendedType?: CardType
  intendedDeckId?: ID
}

export function useCreateDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewDraftInput) => {
      const draft: Draft = { id: newId(), createdAt: Date.now(), ...input }
      await repo.drafts.put(draft)
      return draft
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.drafts }),
  })
}

export function useDeleteDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: ID) => repo.drafts.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.drafts }),
  })
}
