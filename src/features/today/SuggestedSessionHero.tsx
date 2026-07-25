import { Link } from 'react-router-dom'
import { Clock, Play, SlidersHorizontal } from 'lucide-react'

// Placeholder content (docs/itera-decisions.md): no suggested-session
// algorithm exists yet, so the numbers here are illustrative, not computed
// from real due-card data. "Start session" is real navigation (/review,
// today's actual queue) — a dead primary action would be worse than an
// honest placeholder around it. "Adjust session" has no behavior yet.
//
// The layered-card effect is the logo motif's one sanctioned reuse outside
// the mark itself (spec §4.2: "within the Today session hero when
// appropriate") — two offset ghost panels behind the real card, not a
// separate illustration.
export function SuggestedSessionHero() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute inset-x-6 -bottom-3 h-full rounded-itera-card bg-itera-navy/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-3 -bottom-1.5 h-full rounded-itera-card bg-itera-navy/55"
      />
      <div className="relative overflow-hidden rounded-itera-card bg-itera-navy p-7 text-white shadow-[var(--itera-shadow-float)]">
        <div className="text-xs font-bold uppercase tracking-wide text-itera-accent">
          Today&rsquo;s session
        </div>
        <div className="mt-2 font-itera-display text-4xl font-bold tracking-tight">
          24 cards
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-white/70">
          <Clock size={14} />
          Approximately 15 minutes
        </div>
        <div className="mt-4 text-sm text-white/80">
          C++ · Type deduction · Storage duration
        </div>
        <div className="mt-5 flex items-center gap-4">
          <Link
            to="/review"
            className="inline-flex items-center gap-1.5 rounded-itera-control bg-itera-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:brightness-105"
          >
            <Play size={15} />
            Start session
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            <SlidersHorizontal size={14} />
            Adjust session
          </button>
        </div>
      </div>
    </div>
  )
}
