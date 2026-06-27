import { LazyCodeView } from '@/components/code/LazyCodeView'
import { RichText } from '@/components/text/RichText'
import type { QuestionProps } from '../../registry/types'

export function CodeReadingQuestion({ content }: QuestionProps<'codeReading'>) {
  return (
    <div className="space-y-4">
      <LazyCodeView code={content.code.code} language={content.code.language} />
      <RichText
        text={content.question}
        className="text-[15px] font-semibold leading-snug"
      />
    </div>
  )
}
