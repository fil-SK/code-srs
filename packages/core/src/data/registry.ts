// The one place either platform names its storage backend.
//
// Core owns the Repository *contract* and the shared hooks that read through
// it; it deliberately owns no way to build one. The web app configures Dexie or
// Supabase from `import.meta.env`, a React Native app will configure Supabase
// from its own config, and neither of those decisions can live in a package
// that must compile with no DOM and no Node globals. So the platform registers
// a factory at boot and everything above the seam asks for the result.
//
// A factory rather than an instance, because construction must not happen at
// import time: the web entry point calls this before React renders, and the
// backend it names opens a database. Deferring construction to the first
// `getRepository()` is what lets the shared hooks be imported by a module graph
// that has not booted yet - a test file, a Metro bundle, an SSR pass.
//
// There is no default. A missing `configureRepository()` throws on first use
// rather than silently falling back to some backend, because "silently the
// wrong storage" is the failure this indirection exists to prevent.
import type { Repository } from './repository'

let factory: (() => Repository) | null = null
let instance: Repository | null = null

// Register the backend. Called once per platform entry point, before anything
// can issue a query. Re-registering drops the cached instance so the next
// `getRepository()` builds from the new factory - the property that lets one
// test configure an isolated repository without leaking it into the next.
export function configureRepository(create: () => Repository): void {
  factory = create
  instance = null
}

// The configured backend. Built on first call, reused after that.
export function getRepository(): Repository {
  if (!factory) {
    throw new Error(
      'No repository configured. The platform entry point must call configureRepository() before any query or mutation runs.',
    )
  }
  return (instance ??= factory())
}
