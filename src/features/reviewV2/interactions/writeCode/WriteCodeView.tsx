import { useEffect } from 'react'
import { RichText } from '@/components/text/RichText'
import { LazyCodeEditor } from '@/components/code/LazyCodeEditor'
import { LazyCodeView } from '@/components/code/LazyCodeView'
import { SUPPORTED_LANGUAGES } from '@/components/code/languageList'
import { cn } from '@/lib/cn'
import { matchesAcceptedAnswer } from '@/domain/grading/writeCode'
import { InteractionLabel } from '../../components/InteractionLabel'
import type { InteractionViewProps } from '../types'

function languageLabel(id: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.id === id)?.label ?? id
}

// No partial read-only region: the current CodeEditor is fully editable with
// no support for mixed editable/read-only content in one instance (see
// docs/itera-decisions.md). The whole starter block is the editable region —
// "visibly distinct" is satisfied by the editor's own bordered/mono/focus-
// ring chrome against surrounding prose, plus the language badge, rather than
// an in-editor read-only boundary that isn't supported yet.
export function WriteCodeView({
  card,
  phase,
  response,
  setResponse,
  onPrimaryAction,
  responseReady,
  hideActions,
}: InteractionViewProps<'write_code'>) {
  const { interaction } = card
  const code = (response as string | undefined) ?? interaction.starterCode
  const locked = phase.kind !== 'presenting' || hideActions
  const showFeedback =
    phase.kind === 'feedback' ||
    phase.kind === 'rating' ||
    phase.kind === 'transitioning'

  // The editor is uncontrolled after mount (see CodeEditor's own note) — seed
  // `response` with the starter code once, so submitting without editing
  // anything still submits real content, not undefined.
  useEffect(() => {
    if (response === undefined) setResponse(interaction.starterCode)
    // Mount-only: callers remount this whole tree (key={card.id}) per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const correct = showFeedback
    ? matchesAcceptedAnswer(code, interaction.acceptedAnswers, interaction.comparison)
    : null

  return (
    <div>
      <InteractionLabel text="Write Code" />
      <div className="mt-1 flex items-center gap-2">
        <RichText
          text={card.prompt.value}
          className="flex-1 text-lg font-semibold leading-snug text-itera-ink-brand"
        />
        <span className="shrink-0 rounded-itera-pill bg-itera-navy-soft px-2.5 py-1 font-mono text-xs font-semibold text-itera-ink-brand">
          {languageLabel(interaction.language)}
        </span>
      </div>

      <div className="mt-4">
        {locked ? (
          // Feedback state: the learner's submitted answer, frozen — reusing
          // the read-only viewer (unmodified) rather than making the editor
          // itself read-only, so "preserve the answer after submission" is
          // exact by construction, not a state-tracking assumption.
          <LazyCodeView code={code} language={interaction.language} />
        ) : (
          <LazyCodeEditor
            value={code}
            language={interaction.language}
            onChange={setResponse}
          />
        )}
      </div>

      {phase.kind === 'presenting' && !hideActions && (
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={!responseReady}
          className="mt-4 rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
        >
          Submit answer
        </button>
      )}

      {showFeedback && (
        <>
          <div
            className={cn(
              'mt-4 rounded-itera-control px-3.5 py-2.5 text-sm font-semibold',
              correct
                ? 'bg-itera-success-soft text-itera-success'
                : 'bg-itera-error-soft text-itera-error',
            )}
          >
            {correct ? 'Correct' : 'Incorrect'}
          </div>
          {!correct && (
            <div className="mt-3">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-itera-muted">
                Expected answer
              </div>
              <LazyCodeView
                code={interaction.acceptedAnswers[0] ?? ''}
                language={interaction.language}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
