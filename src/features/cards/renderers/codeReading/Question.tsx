import { LazyCodeView } from '@/components/code/LazyCodeView'
import type { QuestionProps } from '../../registry/types'

export function CodeReadingQuestion({ content }: QuestionProps<'codeReading'>) {
  return (
    <div className="space-y-4">
      <LazyCodeView code={content.code.code} language={content.code.language} />
      <div className="whitespace-pre-wrap text-[15px] font-semibold leading-snug">
        {content.question}
      </div>
    </div>
  )
}
