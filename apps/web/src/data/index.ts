// Compatibility shim - defines nothing. The registry is
// packages/core/src/data/registry.ts, published as @itera/core, and the web
// app's choice of backend is made once in src/main.tsx.
//
// It exists so relocating the seam did not have to be the same commit as
// rewriting every call site. New code should import from '@itera/core'
// directly; this layer is transitional.

export { configureRepository, getRepository } from '@itera/core'
export type { Repository } from './repository'
