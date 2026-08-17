import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useDialogs } from '@/components/ui/dialogs'
import { getRepository } from '@/data'
import { createCardStateBackfill } from '@/domain/migration/cardStateBackfill'
import type { MigrationReport } from '@/domain/migration/runner'

function ReportSummary({ report }: { report: MigrationReport }) {
  return (
    <div className="mt-3 space-y-1 rounded-[10px] border border-itera-border bg-itera-surface-subtle p-3 text-xs text-itera-muted">
      <div>
        Cards: <span className="font-semibold text-itera-ink">{report.beforeCounts.cards}</span>
      </div>
      <div>
        CardState rows:{' '}
        <span className="font-semibold text-itera-ink">{report.beforeCounts.cardStates}</span> →{' '}
        <span className="font-semibold text-itera-ink">{report.afterCounts.cardStates}</span>
      </div>
      <div>
        Would write / wrote:{' '}
        <span className="font-semibold text-itera-ink">{report.changed.length}</span> · already up
        to date: <span className="font-semibold text-itera-ink">{report.skipped.length}</span>
      </div>
      {report.orphans.length > 0 && (
        <div className="text-itera-warning">
          {report.orphans.length} orphaned CardState row(s) (no matching card) — not deleted,
          only reported.
        </div>
      )}
      {report.warnings.length > 0 && (
        <div className="text-itera-warning">{report.warnings.join('; ')}</div>
      )}
    </div>
  )
}

// docs/itera-migration-plan.md §0: apply() against real data is a
// human-reviewed action, not something to trigger as a side effect of
// shipping code. This is that review surface — dry run first, always;
// Apply only enables once a dry run's report has actually been seen.
// Purely additive and idempotent (see docs/itera-decisions.md D38-D43),
// so running it more than once, or leaving it un-run, is both safe.
export function CardStateMigrationSection() {
  const [dryRunReport, setDryRunReport] = useState<MigrationReport | null>(null)
  const [applyReport, setApplyReport] = useState<MigrationReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogs = useDialogs()

  async function runDryRun() {
    setBusy(true)
    setError(null)
    try {
      const backfill = createCardStateBackfill(getRepository())
      setDryRunReport(await backfill.dryRun())
      setApplyReport(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function runApply() {
    if (!dryRunReport) return
    const proceed = await dialogs.confirm({
      title: `Write ${dryRunReport.changed.length} CardState row(s)?`,
      description:
        'This only adds or updates rows in the new CardState store — Card.scheduling is not ' +
        'touched, and nothing reads from CardState yet. Safe to run more than once.',
      confirmLabel: 'Write rows',
    })
    if (!proceed) return
    setBusy(true)
    setError(null)
    try {
      const backfill = createCardStateBackfill(getRepository())
      setApplyReport(await backfill.apply())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const report = applyReport ?? dryRunReport

  return (
    <div>
      <p className="mb-3 text-sm text-itera-muted">
        Backfills a CardState row per card — the Itera redesign's Phase D groundwork
        (docs/itera-decisions.md D38–D43). Additive and idempotent: nothing reads from
        these rows yet, so running it (or re-running it) is always safe.
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button onClick={runDryRun} disabled={busy}>
          {busy ? 'Working…' : 'Run dry run'}
        </Button>
        <Button variant="secondary" onClick={runApply} disabled={busy || !dryRunReport}>
          Apply
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-itera-error">{error}</p>}

      {applyReport && (
        <p className="mt-3 text-sm font-semibold text-itera-success">Applied.</p>
      )}
      {!applyReport && dryRunReport && (
        <p className="mt-3 text-sm text-itera-muted">Dry run only — nothing written yet.</p>
      )}
      {report && <ReportSummary report={report} />}
    </div>
  )
}
