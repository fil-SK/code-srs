// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/hooks/ and is published as @itera/core.
//
// It exists so moving the data hooks into the shared package did not have to be
// the same commit as rewriting every feature's imports. New code should import
// from '@itera/core' directly; this layer is transitional.

export {
  useCreateRoadmap,
  useDeleteRoadmap,
  useRoadmap,
  useRoadmaps,
  useSaveRoadmap,
} from '@itera/core'
