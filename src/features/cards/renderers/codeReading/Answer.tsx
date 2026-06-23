import type { AnswerProps } from '../../registry/types'

export function CodeReadingAnswer({ content }: AnswerProps<'codeReading'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Answer
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {content.answer}
      </div>
    </>
  )
}
