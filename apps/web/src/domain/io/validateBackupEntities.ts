// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/domain/io/validateBackupEntities.ts and is published as @fliptap/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@fliptap/core'
// directly; this layer is transitional.

export {
  assertValidCards,
  assertValidDecks,
  assertValidDrafts,
  assertValidReviewLogs,
  assertValidRoadmaps,
  findUnresolvedDeckReference,
} from '@fliptap/core'
