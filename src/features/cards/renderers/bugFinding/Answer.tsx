import { RichText } from '@/components/text/RichText'
import type { AnswerProps } from '../../registry/types'

export function BugFindingAnswer({ content }: AnswerProps<'bugFinding'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Explanation
      </div>
      <RichText text={content.explanation} className="text-sm leading-relaxed" />
    </>
  )
}
