// Compatibility shim - defines nothing. The canonical implementation lives in
// packages/core/src/today/greetings.ts and is published as @fliptap/core.
//
// It exists so relocating the domain layer did not have to be the same commit
// as rewriting ~130 files' imports. New code should import from '@fliptap/core'
// directly; this layer is transitional.

export { DASHBOARD_MESSAGES, getTimeBucket, pickDashboardMessage } from '@fliptap/core'

export type { DashboardMessage, TimeBucket } from '@fliptap/core'
