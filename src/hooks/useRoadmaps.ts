import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ID, Roadmap } from '@/types'
import { getRepository } from '@/data'
import { newId } from '@/lib/id'
import { qk } from './queryKeys'

const repo = getRepository()

export function useRoadmaps() {
  return useQuery({ queryKey: qk.roadmaps, queryFn: () => repo.roadmaps.getAll() })
}

export function useRoadmap(id: ID | undefined) {
  return useQuery({
    queryKey: id ? qk.roadmap(id) : qk.roadmaps,
    queryFn: () => repo.roadmaps.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title: string; description?: string }) => {
      const now = Date.now()
      const roadmap: Roadmap = {
        id: newId(),
        title: input.title,
        description: input.description,
        nodes: [],
        edges: [],
        createdAt: now,
        updatedAt: now,
      }
      await repo.roadmaps.put(roadmap)
      return roadmap
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.roadmaps }),
  })
}

export function useSaveRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (roadmap: Roadmap) => {
      const saved = { ...roadmap, updatedAt: Date.now() }
      await repo.roadmaps.put(saved)
      return saved
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: qk.roadmaps })
      qc.setQueryData(qk.roadmap(saved.id), saved)
    },
  })
}

export function useDeleteRoadmap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: ID) => repo.roadmaps.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.roadmaps }),
  })
}
