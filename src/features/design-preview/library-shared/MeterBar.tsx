// Extracted from the progress-bar recipe duplicated in MomentumPanel.tsx and
// ContinueLearningList.tsx (h-1 rounded-itera-pill bg-itera-border track +
// bg-itera-accent fill) — first proper extraction of this pattern. Kept
// local to the Library preview per the isolation scope; promote to
// src/components/ui/ only once Phase H validates it against those real
// call sites too.
export function MeterBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      className="h-1 overflow-hidden rounded-itera-pill bg-itera-border"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-itera-pill bg-itera-accent" style={{ width: `${pct}%` }} />
    </div>
  )
}
