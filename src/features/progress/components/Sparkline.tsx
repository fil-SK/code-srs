// Minimal hand-rolled SVG trend line, matching this codebase's existing
// "no charting library" convention (PaceChart.tsx, MasteryRing.tsx). Used
// by the Reviews KPI tile. Deliberately just a stroked polyline (no area fill,
// no axes) since it's
// read at a glance, not analyzed.
export function Sparkline({
  values,
  color,
  width = 64,
  height = 24,
}: {
  values: number[]
  color: string
  width?: number
  height?: number
}) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)
  const points = values
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
