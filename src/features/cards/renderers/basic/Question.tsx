import { RichText } from '@/components/text/RichText'
import type { QuestionProps } from '../../registry/types'

export function BasicQuestion({ content }: QuestionProps<'basic'>) {
  return (
    <RichText
      text={content.front}
      className="text-xl font-semibold leading-relaxed"
    />
  )
}
