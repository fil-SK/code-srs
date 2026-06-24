import type { AnswerProps } from '../../registry/types'

export function McqAnswer({ content }: AnswerProps<'mcq'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {content.explanation ? 'Explanation' : 'Answer'}
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {content.explanation?.trim() || 'Correct answers are highlighted above.'}
      </div>
    </>
  )
}
