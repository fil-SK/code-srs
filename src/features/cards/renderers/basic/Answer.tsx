import { RichText } from '@/components/text/RichText'
import type { AnswerProps } from '../../registry/types'

export function BasicAnswer({ content }: AnswerProps<'basic'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Answer
      </div>
      <RichText text={content.back} className="text-sm leading-relaxed" />
    </>
  )
}
