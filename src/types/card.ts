import type { ID, Millis } from './common'
import type { SchedulingState } from './review'

// The card model. One shape for every card in the app: content plus its own
// embedded FSRS scheduling. The v1 8-type union and the Card/Card
// content-vs-record split it required were deleted when the two models
// converged (see docs/itera-decisions.md) - there is no second card type and
// no on-read migration.
//
// Deliberately uses Millis (not ISO strings) and the existing SchedulingState
// field names (`reps`, `due`, `scheduledDays`, ...), matching this codebase's
// conventions rather than the spec's illustrative examples literally.

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

// ---- Card ----

export const CARD_SCHEMA_VERSION = 2

export interface Card {
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
  suspended: boolean
  scheduling: SchedulingState
  order?: number // manual position within a deck; review ignores it
}
