import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { Panel, SectionShell } from './SectionShell'

export function StudySection() {
  return (
    <SectionShell title="Study settings" description="Understand how your study sessions and review schedule work.">
      <Panel>
        <div className="flex items-center gap-3">
          <GraduationCap size={22} aria-hidden="true" className="text-fliptap-muted" />
          <h3 className="text-base font-bold text-fliptap-ink-brand">Spaced repetition (FSRS)</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fliptap-muted">
          FlipTap uses FSRS (Free Spaced Repetition Scheduler) to decide when each card is due.
          Your review history and Again, Hard, Good or Easy rating shape the next interval.
          The intervals shown during review are calculated for that card.
        </p>
        <div className="mt-4 rounded-fliptap-control bg-fliptap-surface-subtle p-4 text-sm">
          <p className="font-semibold text-fliptap-ink-brand">Automatic scheduling</p>
          <p className="mt-1 leading-relaxed text-fliptap-muted">
            All decks use the scheduler’s default parameters, including short-term learning steps.
            Custom FSRS parameters and retention targets are not available yet.
          </p>
        </div>
        <Link to="/help/articles/review-ratings" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-fliptap-ink-brand underline underline-offset-4">
          Learn how to rate your answers →
        </Link>
      </Panel>
      <Panel>
        <h3 className="text-base font-bold text-fliptap-ink-brand">Your next session</h3>
        <p className="mt-2 text-sm leading-relaxed text-fliptap-muted">
          Use Adjust session on Today to choose a deck or collection and a card count.
          These choices apply to the session you launch; they are not saved as a study preference.
        </p>
        <Link to="/" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-fliptap-ink-brand underline underline-offset-4">Go to Today →</Link>
      </Panel>
    </SectionShell>
  )
}
