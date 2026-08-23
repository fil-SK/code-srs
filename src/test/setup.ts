// The web suite's bootstrap. Runs before every src/ test file, and only those:
// @itera/core's tests are a separate Vitest project with no setup at all
// (vitest.config.ts).
import 'fake-indexeddb/auto' // an in-memory IndexedDB so Dexie works under Node
import { configureRepository } from '@itera/core'
import { DexieRepository } from '@/data/dexie/DexieRepository'

// Explicit, because it is no longer implied. Tests used to get Dexie by
// omission - the VITE_SUPABASE_* vars are blanked, and the old getRepository()
// fell back to local storage when they were - but core's registry has no
// default and throws instead. Naming the backend here is the honest version of
// what the suite always meant, and it is the same shape as the web app's own
// boot in src/main.tsx.
//
// Setup files run before test modules evaluate, so the many files that do
// `const repo = getRepository()` at module scope keep working unchanged.
configureRepository(() => new DexieRepository())
