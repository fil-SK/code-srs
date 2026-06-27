import { RichText } from '@/components/text/RichText'
import type { AnswerProps } from '../../registry/types'

export function McqAnswer({ content }: AnswerProps<'mcq'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {content.explanation ? 'Explanation' : 'Answer'}
      </div>
      <RichText
        text={content.explanation?.trim() || 'Correct answers are highlighted above.'}
        className="text-sm leading-relaxed"
      />
    </>
  )
}
