import type { ID, Millis } from './common'
import type { InteractionType } from './card'

// FSRS grades. The 4-button self-grade bar maps directly to these.
export type Rating = 1 | 2 | 3 | 4 // Again | Hard | Good | Easy

export type SchedulingStateKind = 'new' | 'learning' | 'review' | 'relearning'

// Per-card scheduling state. Mirrors the ts-fsrs Card shape so the scheduler
// (added in M2) can consume/produce it directly.
export interface SchedulingState {
  due: Millis
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  learningSteps: number // current (re)learning step index; persisted for FSRS
  state: SchedulingStateKind
  lastReview?: Millis
}

// One row per review. Stats are derived from these logs, never denormalized.
export interface ReviewLog {
  id: ID
  cardId: ID
  reviewedAt: Millis
  rating: Rating
  autoGraded: boolean // came from an auto-check vs a manual self-rate
  durationMs: number
  stabilityBefore: number
  stabilityAfter: number
  difficultyBefore: number
  difficultyAfter: number
  stateBefore: SchedulingStateKind
  state: SchedulingStateKind
  // Resulting next-due instant. Optional because rows logged before this field
  // existed genuinely cannot recover it. The scheduled interval is derivable
  // from `dueAfter - reviewedAt`, so FSRS's scheduledDays is not logged
  // separately; dueAfter also covers learning steps, where scheduledDays is 0
  // but the card is due again in minutes.
  dueAfter?: Millis
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
