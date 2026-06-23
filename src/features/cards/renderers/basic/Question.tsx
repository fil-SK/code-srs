import type { QuestionProps } from '../../registry/types'

export function BasicQuestion({ content }: QuestionProps<'basic'>) {
  return (
    <div className="whitespace-pre-wrap text-[17px] font-semibold leading-snug">
      {content.front}
    </div>
  )
}
