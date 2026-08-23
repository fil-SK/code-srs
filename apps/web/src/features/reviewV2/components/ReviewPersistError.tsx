import { useEffect, useRef } from 'react'
import { TriangleAlert } from 'lucide-react'

// Shown in place of the rating controls' note when a graded review could not be
// written. Deliberately the smallest coherent failure surface: no dialog (it
// would steal focus out of the chrome-free Review route), no second exit button
// (Escape and the top bar's X already leave a session), and no way back to the
// rating buttons - the learner has already answered and already chosen a grade,
// and the retry re-sends that same computed result rather than grading again.
//
// `message` is always domain copy from describeReviewCommitFailure; raw
// IndexedDB or PostgREST text never reaches this component.
export function ReviewPersistError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const retryRef = useRef<HTMLButtonElement>(null)

  // Review is a keyboard-first surface and the rating buttons have just gone
  // disabled, so focus would otherwise be left on a dead control with nothing
  // reachable but Tab. This is the only actionable thing on screen.
  useEffect(() => {
    retryRef.current?.focus()
  }, [])

  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-3 rounded-itera-card border border-itera-error bg-itera-error-soft p-4"
    >
      <TriangleAlert
        aria-hidden="true"
        size={18}
        className="mt-0.5 shrink-0 text-itera-error"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-itera-ink-brand">{message}</p>
      </div>
      <button
        ref={retryRef}
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-itera-control bg-itera-accent px-3.5 py-2 text-sm font-semibold text-white outline-none transition-opacity hover:brightness-105 focus-visible:ring-2 focus-visible:ring-itera-accent focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  )
}
