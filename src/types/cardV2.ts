import type { ID, Millis } from './common'
import type { SchedulingState, SchedulingStateKind } from './review'

// v2 card model, per docs/architecture.md. Lives alongside the
// current `Card` union (./card.ts) through the Phase C/D migration; nothing in
// the production app reads these types yet — only the migrators
// (src/domain/migration/) and the /design-preview/* routes.
//
// Deliberately uses Millis (not ISO strings) and the existing SchedulingState
// field names (`reps`, `due`, `scheduledDays`, ...), matching this codebase's
// conventions rather than the spec's illustrative examples literally, so the
// eventual CardState split (docs/itera-migration-plan.md §4) needs no
// translation layer between the FSRS wrapper's output and this shape. See
// docs/itera-decisions.md D6/D7.

export interface RichContent {
  format: 'markdown'
  value: string
}

export function richText(value: string): RichContent {
  return { format: 'markdown', value }
}

// ---- Interaction payloads (spec §31) ----

export type AuthoringPreset =
  | 'standard'
  | 'code_reading'
  | 'find_the_bug'
  | 'predict_output'
  | 'explain_code'

export interface RecallInteraction {
  type: 'recall'
  answer: RichContent
  authoringPreset?: AuthoringPreset
}

export interface McOption {
  id: ID
  content: RichContent
  correct: boolean
}

export interface MultipleChoiceInteraction {
  type: 'multiple_choice'
  selectionMode: 'single' | 'multiple'
  randomizeOptions: boolean
  options: McOption[]
}

export interface WriteCodeInteraction {
  type: 'write_code'
  language: string
  starterCode: string
  // MVP: one editable region (spec §31.3 explicitly allows this simplification).
  editableRegion?: { startLine: number; endLine: number }
  acceptedAnswers: string[]
  comparison: {
    trimOuterWhitespace: boolean
    normalizeLineEndings: boolean
    ignoreTrailingWhitespace: boolean
    caseSensitive: boolean
  }
}

export interface OrderingItemV2 {
  id: ID
  content: RichContent
}

export interface OrderingInteraction {
  type: 'ordering'
  randomize: boolean
  items: OrderingItemV2[] // stored in correct order
  correctOrder: ID[]
}

export interface MatchingColumnItem {
  id: ID
  content: RichContent
}

export interface MatchingColumn {
  id: ID // e.g. 'source' | 'target' | a third custom column id
  label?: string
  items: MatchingColumnItem[]
  // A fixed column shares one value list across rows, graded by value equality —
  // this codebase's existing matching feature already goes beyond the spec's
  // two-column MVP (3-part matching, fixed-option columns); extended here rather
  // than downgraded. See docs/itera-migration-plan.md §5.
  fixed?: boolean
}

export interface MatchingInteraction {
  type: 'matching'
  columns: MatchingColumn[] // first column is the fixed "source" side
  relationships: Array<Record<string, ID>> // one row: columnId -> itemId
}

export type WalkthroughStepResponse =
  | { type: 'recall'; answer: RichContent }
  | {
      type: 'multiple_choice'
      selectionMode: 'single' | 'multiple'
      options: McOption[]
    }
  | { type: 'exact_input'; acceptedAnswers: string[] }

export interface WalkthroughStep {
  id: ID
  // Multiple ranges (not spec's single {startLine,endLine}) — preserves this
  // codebase's existing multi-range highlight capability. See migration §5.
  focus?: Array<{ startLine: number; endLine: number }>
  prompt: RichContent
  tip?: RichContent
  explanation?: RichContent
  response: WalkthroughStepResponse
}

export interface WalkthroughInteraction {
  type: 'walkthrough'
  scenario: RichContent
  code?: { language: string; value: string }
  image?: string // data URL, matching the existing Story card's approach
  steps: WalkthroughStep[]
}

export type CardInteraction =
  | RecallInteraction
  | MultipleChoiceInteraction
  | WriteCodeInteraction
  | OrderingInteraction
  | MatchingInteraction
  | WalkthroughInteraction

export type InteractionType = CardInteraction['type']

// ---- Card (v2) ----

export const CARD_V2_SCHEMA_VERSION = 2

export interface CardV2 {
  id: ID
  schemaVersion: number
  deckId: ID
  prompt: RichContent
  tip?: RichContent
  explanation?: RichContent
  interaction: CardInteraction
  tags: string[]
  createdAt: Millis
  updatedAt: Millis
}

// ---- CardV2Record — the persisted form of CardV2 (Itera Phase F) ----
// Embeds its own scheduling, mirroring how v1 CardBase embeds SchedulingState,
// deliberately independent of the CardState extraction below: new CardV2-
// authored cards never touch the cardStates dual-write store, so this doesn't
// advance or interact with that (separate, still-in-progress) migration.

export interface CardV2Record extends CardV2 {
  suspended: boolean
  scheduling: SchedulingState
  order?: number // manual position within a deck; not yet wired to drag-reorder UI
}

// ---- CardState — scheduling, separated from content (spec §7.6, §9.2) ----
// Not yet wired into the repository/write path; that split is Phase D/F work
// (docs/itera-migration-plan.md §4). This type exists now so migrators and
// preview routes can be written against the target shape.

export interface CardState {
  cardId: ID
  due: Millis
  state: SchedulingStateKind
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  suspended: boolean
  lastReview?: Millis
}

// ---- ReviewEvent — immutable review history (spec §9.3) ----

export interface ReviewEvent {
  id: ID
  cardId: ID
  sessionId: ID
  interactionType: InteractionType
  reviewedAt: Millis
  rating: 1 | 2 | 3 | 4 // Again | Hard | Good | Easy
  autoGraded: boolean
  responseDurationMs: number
  stabilityBefore: number
  stabilityAfter: number
  difficultyBefore: number
  difficultyAfter: number
  stateAfter: SchedulingStateKind
  metadata?: Record<string, unknown> // per-step Walkthrough outcomes, etc.
}

// ---- StudySession (spec §9.1) ----

export type SessionSource =
  | { kind: 'due' }
  | { kind: 'deck'; deckId: ID }
  | { kind: 'decks'; deckIds: ID[] }
  | { kind: 'collection'; collectionId: ID }

export interface StudySession {
  id: ID
  source: SessionSource
  cardIds: ID[]
  currentIndex: number
  startedAt: Millis
  completedAt?: Millis
  goal?: { cardCount?: number; targetMinutes?: number }
}
