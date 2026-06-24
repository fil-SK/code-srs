import { LazyCodeView } from '@/components/code/LazyCodeView'
import type { AnswerProps } from '../../registry/types'

export function CodeCompletionAnswer({ content }: AnswerProps<'codeCompletion'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Solution
      </div>
      <LazyCodeView
        code={content.solutions[0] ?? ''}
        language={content.scaffold.language}
      />
      {content.solutions.length > 1 && (
        <div className="mt-1.5 text-xs text-faint">
          + {content.solutions.length - 1} other accepted answer
          {content.solutions.length - 1 === 1 ? '' : 's'}
        </div>
      )}
      {content.explanation?.trim() && (
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {content.explanation}
        </div>
      )}
    </>
  )
}
