import { SupabaseRepository, type Repository } from '@itera/core'
import { DexieRepository } from './dexie/DexieRepository'
import { getSupabase, isSupabaseConfigured } from './supabase/client'

let instance: Repository | null = null

// Single entry point for storage. When Supabase env is configured the app uses
// the cloud backend; otherwise it falls back to local Dexie. The rest of the app
// depends on the Repository interface alone and never knows which is active.
//
// Reading the configuration and building the browser client is this layer's job:
// SupabaseRepository takes a ready client and never looks at the environment.
export function getRepository(): Repository {
  if (!instance) {
    instance = isSupabaseConfigured
      ? new SupabaseRepository(getSupabase())
      : new DexieRepository()
  }
  return instance
}

export type { Repository } from './repository'
