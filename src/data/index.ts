import type { Repository } from './repository'
import { DexieRepository } from './dexie/DexieRepository'
import { isSupabaseConfigured } from './supabase/client'
import { SupabaseRepository } from './supabase/SupabaseRepository'

let instance: Repository | null = null

// Single entry point for storage. When Supabase env is configured the app uses
// the cloud backend; otherwise it falls back to local Dexie. The rest of the app
// depends on the Repository interface alone and never knows which is active.
export function getRepository(): Repository {
  if (!instance) {
    instance = isSupabaseConfigured
      ? new SupabaseRepository()
      : new DexieRepository()
  }
  return instance
}

export type { Repository } from './repository'
