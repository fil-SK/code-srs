import type { AnswerProps } from '../../registry/types'
import { ExplanationView } from '../Explanation'

// The per-step answers were already revealed inline while stepping, so the outer
// reveal is just the wrap-up: an optional overall explanation plus the cue to
// self-grade the whole assignment.
export function StoryAnswer({ content }: AnswerProps<'story'>) {
  const count = content.steps.length
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Wrap-up
      </div>
      <p className="text-sm text-muted">
        You walked through all {count} step{count === 1 ? '' : 's'}. Grade how well
        you handled the assignment.
      </p>
      <ExplanationView text={content.explanation} />
    </>
  )
}
