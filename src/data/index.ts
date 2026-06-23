import type { Repository } from './repository'
import { DexieRepository } from './dexie/DexieRepository'

let instance: Repository | null = null

// Single entry point for storage. Swapping to Supabase later means changing only
// this factory — the rest of the app depends on the Repository interface alone.
export function getRepository(): Repository {
  if (!instance) instance = new DexieRepository()
  return instance
}

export type { Repository } from './repository'
