import { LazyCodeView } from '@/components/code/LazyCodeView'
import { LazyCodeEditor } from '@/components/code/LazyCodeEditor'
import type { QuestionProps } from '../../registry/types'

export function CodeCompletionQuestion({
  content,
  response,
  setResponse,
  revealed,
}: QuestionProps<'codeCompletion'>) {
  const answer = (response as string | undefined) ?? ''
  const lang = content.scaffold.language

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-muted">
        Complete the missing code:
      </div>
      <LazyCodeView code={content.scaffold.code} language={lang} />

      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Your answer
        </div>
        {revealed ? (
          <LazyCodeView code={answer || '(no answer)'} language={lang} />
        ) : (
          <LazyCodeEditor value={answer} language={lang} onChange={setResponse} />
        )}
      </div>
    </div>
  )
}
