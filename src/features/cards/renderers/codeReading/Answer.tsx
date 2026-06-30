import { RichText } from '@/components/text/RichText'
import type { AnswerProps } from '../../registry/types'
import { ExplanationView } from '../Explanation'

export function CodeReadingAnswer({ content }: AnswerProps<'codeReading'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Answer
      </div>
      <RichText text={content.answer} className="text-sm leading-relaxed" />
      <ExplanationView text={content.explanation} />
    </>
  )
}
