// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/library/deckMark.ts and is published as @itera/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@itera/core'
// directly; this layer is transitional.

export { markLabelFor } from '@itera/core'
