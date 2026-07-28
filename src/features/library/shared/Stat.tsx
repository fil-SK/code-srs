import type { LucideIcon } from 'lucide-react'

// One icon+value+label metric, used by both the focused Deck header and the
// Collection/container header so the two identity headers read as the same
// visual language.
export function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={18} className={accent ? 'text-itera-accent' : 'text-itera-muted'} />
      <div>
        <div className={`font-itera-display text-lg font-bold ${accent ? 'text-itera-accent' : 'text-itera-ink-brand'}`}>
          {value}
        </div>
        <div className="text-xs text-itera-muted">{label}</div>
      </div>
    </div>
  )
}
