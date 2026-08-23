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
