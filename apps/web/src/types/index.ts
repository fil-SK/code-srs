// Compatibility shim. The canonical entity contracts now live in
// packages/core/src/types/ and are published as @itera/core; nothing is
// defined here.
//
// It exists so relocating the types did not have to be the same commit as
// rewriting ~145 files' imports. New code should import from '@itera/core'
// directly; this layer is transitional and will be removed once the web app's
// imports have been migrated.
//
// `export type *`, not `export *`, deliberately: that is exactly what this
// barrel did before the move, so `@/types` still exposes types only and the
// two runtime values (richText, CARD_SCHEMA_VERSION) still come from
// '@/types/card'. Preserving the surface byte-for-byte is what makes this a
// relocation rather than a behaviour change.
export type * from '@itera/core'
