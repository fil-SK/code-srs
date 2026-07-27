import { useEffect } from 'react'
import { RichText } from '@/components/text/RichText'
import { LazyCodeEditor } from '@/components/code/LazyCodeEditor'
import { LazyCodeView } from '@/components/code/LazyCodeView'
import { SUPPORTED_LANGUAGES } from '@/components/code/languageList'
import { cn } from '@/lib/cn'
import { matchesAcceptedAnswer } from '@/domain/grading/writeCode'
import { FlashcardSurface } from '../../components/FlashcardSurface'
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
  const flipped = phase.kind !== 'presenting'

  // The editor is uncontrolled after mount (see CodeEditor's own note) — seed
  // `response` with the starter code once, so submitting without editing
  // anything still submits real content, not undefined.
  useEffect(() => {
    if (response === undefined) setResponse(interaction.starterCode)
    // Mount-only: callers remount this whole tree (key={card.id}) per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const correct = flipped
    ? matchesAcceptedAnswer(code, interaction.acceptedAnswers, interaction.comparison)
    : null

  const header = (size: 'front' | 'back') => (
    <div className="flex flex-col items-center gap-1 text-center">
      <InteractionLabel type="write_code" />
      <div className="mt-2 flex w-full items-center justify-center gap-2">
        <RichText
          text={card.prompt.value}
          className={cn('font-bold leading-snug text-itera-ink-brand', size === 'front' ? 'text-2xl' : 'text-xl')}
        />
      </div>
      <span className="rounded-itera-pill bg-itera-navy-soft px-2.5 py-1 font-mono text-xs font-semibold text-itera-ink-brand">
        {languageLabel(interaction.language)}
      </span>
    </div>
  )

  return (
    <FlashcardSurface
      flipped={flipped}
      onFlip={onPrimaryAction}
      ariaLabel={
        flipped
          ? 'Write code card, results showing'
          : 'Write code card, write your answer and submit to flip'
      }
      front={
        flipped ? null : (
        <div className="flex flex-col gap-4">
          {header('front')}

          <LazyCodeEditor value={code} language={interaction.language} onChange={setResponse} />

          {!hideActions && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={!responseReady}
              className="rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
            >
              Submit answer
            </button>
          )}
        </div>
        )
      }
      back={
        !flipped ? null : (
          <div className="flex flex-col gap-4">
            {header('back')}

            <LazyCodeView code={code} language={interaction.language} />

            <div
              className={cn(
                'rounded-itera-control px-3.5 py-2.5 text-center text-sm font-semibold',
                correct
                  ? 'bg-itera-success-soft text-itera-success'
                  : 'bg-itera-error-soft text-itera-error',
              )}
            >
              {correct ? 'Correct' : 'Incorrect'}
            </div>

            {!correct && (
              <div>
                <div className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-itera-muted">
                  Expected answer
                </div>
                <LazyCodeView
                  code={interaction.acceptedAnswers[0] ?? ''}
                  language={interaction.language}
                />
              </div>
            )}
          </div>
        )
      }
    />
  )
}
