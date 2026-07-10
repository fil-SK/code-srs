import { LazyCodeView } from '@/components/code/LazyCodeView'
import { RichText } from '@/components/text/RichText'
import { Button } from '@/components/ui/Button'
import type { StoryContent } from '@/types'
import type { QuestionProps } from '../../registry/types'
import { readProgress } from './progress'

// Shared context (intro + code + image) that stays pinned while the user walks
// through the steps.
function StoryContext({ content }: { content: StoryContent }) {
  return (
    <>
      {content.intro?.trim() && (
        <RichText text={content.intro} className="text-[15px] leading-relaxed" />
      )}
      {content.code?.code.trim() && (
        <LazyCodeView code={content.code.code} language={content.code.language} />
      )}
      {content.image && (
        <img
          src={content.image}
          alt=""
          className="max-h-80 w-auto rounded-[10px] border border-border"
        />
      )}
    </>
  )
}

export function StoryQuestion({
  content,
  response,
  setResponse,
  readOnly,
}: QuestionProps<'story'>) {
  const { steps } = content

  // Read-only (static preview): show the whole story expanded at once.
  if (readOnly) {
    return (
      <div className="space-y-4">
        <StoryContext content={content} />
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className="rounded-[10px] border border-border bg-panel-2 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Step {i + 1}
              </div>
              <RichText
                text={s.prompt}
                className="mt-1 text-sm font-semibold leading-snug"
              />
              {s.code?.code.trim() && (
                <div className="mt-2">
                  <LazyCodeView code={s.code.code} language={s.code.language} />
                </div>
              )}
              <RichText
                text={s.answer}
                className="mt-2 text-sm leading-relaxed text-muted"
              />
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const { index, revealed } = readProgress(response)
  const clamped = Math.min(Math.max(index, 0), Math.max(steps.length - 1, 0))
  const step = steps[clamped]
  const isLast = clamped >= steps.length - 1

  function reveal() {
    setResponse({ index: clamped, revealed: true })
  }
  function next() {
    setResponse({ index: Math.min(clamped + 1, steps.length - 1), revealed: false })
  }
  function prev() {
    setResponse({ index: Math.max(clamped - 1, 0), revealed: true })
  }

  return (
    <div className="space-y-4">
      <StoryContext content={content} />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Step {clamped + 1} of {steps.length}
        </span>
        {clamped > 0 && (
          <button type="button" onClick={prev} className="hover:text-text">
            ← Previous
          </button>
        )}
      </div>

      {step?.code?.code.trim() && (
        <LazyCodeView code={step.code.code} language={step.code.language} />
      )}
      <RichText
        text={step?.prompt ?? ''}
        className="text-[15px] font-semibold leading-snug"
      />

      {!revealed ? (
        <Button variant="secondary" onClick={reveal}>
          Reveal step
        </Button>
      ) : (
        <div className="reveal-in rounded-[10px] border border-dashed border-border bg-panel-2 p-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            Answer
          </div>
          <RichText text={step?.answer ?? ''} className="text-sm leading-relaxed" />
          {!isLast ? (
            <Button variant="primary" className="mt-3" onClick={next}>
              Next step →
            </Button>
          ) : (
            <div className="mt-3 text-xs font-medium text-faint">
              Last step — grade yourself below.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
