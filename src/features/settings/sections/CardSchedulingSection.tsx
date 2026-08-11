import { CardStateMigrationSection } from '../CardStateMigrationSection'
import { NotBuiltYet, Panel, SectionShell } from './SectionShell'

// Two things share this section: the real, working Phase D CardState
// migration tool (unchanged), and an honest note that FSRS itself is not yet
// configurable. Keeping them together avoids a settings nav entry that is
// entirely placeholder next to one that is entirely real.
export function CardSchedulingSection() {
  return (
    <SectionShell
      title="Card scheduling"
      description="How Itera decides what to show you, and when."
    >
      <Panel>
        <h3 className="text-sm font-semibold text-itera-ink-brand">Spaced repetition (FSRS)</h3>
        <p className="mt-2 text-sm text-itera-muted">
          Reviews are scheduled with FSRS. Its parameters — daily new-card limit, target retention,
          learning steps — are not configurable yet and run on the library defaults.
        </p>
        <div className="mt-4">
          <NotBuiltYet>
            Not available yet. Changing scheduler parameters rewrites future due dates for every
            card, so it needs a migration path before it can be exposed.
          </NotBuiltYet>
        </div>
      </Panel>

      <Panel>
        <h3 className="text-sm font-semibold text-itera-ink-brand">
          Card scheduling migration (Phase D)
        </h3>
        <div className="mt-3">
          <CardStateMigrationSection />
        </div>
      </Panel>
    </SectionShell>
  )
}
