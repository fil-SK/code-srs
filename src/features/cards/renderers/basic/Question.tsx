import type { QuestionProps } from '../../registry/types'

export function BasicQuestion({ content }: QuestionProps<'basic'>) {
  return (
    <div className="whitespace-pre-wrap text-xl font-semibold leading-relaxed">
      {content.front}
    </div>
  )
}
