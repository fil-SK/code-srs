import { LazyCodeView } from '@/components/code/LazyCodeView'
import { LazyCodeEditor } from '@/components/code/LazyCodeEditor'
import { RichText } from '@/components/text/RichText'
import type { QuestionProps } from '../../registry/types'

export function CodeCompletionQuestion({
  content,
  response,
  setResponse,
  revealed,
  readOnly,
}: QuestionProps<'codeCompletion'>) {
  const answer = (response as string | undefined) ?? ''
  const lang = content.scaffold.language
  const hasPrompt = Boolean(content.prompt?.trim())
  const hasScaffold = Boolean(content.scaffold.code.trim())

  return (
    <div className="space-y-3">
      {hasPrompt ? (
        <RichText
          text={content.prompt ?? ''}
          className="text-[15px] font-semibold leading-snug"
        />
      ) : (
        <div className="text-sm font-semibold text-muted">
          Complete the missing code:
        </div>
      )}
      {hasScaffold && <LazyCodeView code={content.scaffold.code} language={lang} />}

      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          Your answer
        </div>
        {revealed ? (
          <LazyCodeView code={answer || '(no answer)'} language={lang} />
        ) : readOnly ? (
          <div className="rounded-[10px] border border-dashed border-border bg-code-bg p-4 text-xs text-faint">
            Flip to reveal the solution.
          </div>
        ) : (
          <LazyCodeEditor value={answer} language={lang} onChange={setResponse} />
        )}
      </div>
    </div>
  )
}
