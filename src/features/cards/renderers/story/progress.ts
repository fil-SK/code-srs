import type { StoryContent } from '@/types'

// The user's walk through a story lives in the review response: which step they
// are on, and whether that step's answer is revealed. Kept here so the Question
// component and the definition's readiness check agree on the shape.
export interface StoryProgress {
  index: number
  revealed: boolean
}

export function readProgress(response: unknown): StoryProgress {
  const r = response as Partial<StoryProgress> | undefined
  return { index: r?.index ?? 0, revealed: r?.revealed ?? false }
}

// The outer "Show answer" / grade bar unlocks only once the last step has been
// revealed, so grading always covers the whole story. A story with no steps is
// trivially ready.
export function isFinished(content: StoryContent, response: unknown): boolean {
  if (content.steps.length === 0) return true
  const { index, revealed } = readProgress(response)
  return revealed && index >= content.steps.length - 1
}
