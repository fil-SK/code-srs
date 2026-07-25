import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Clock, Play, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

// Placeholder content (docs/itera-decisions.md): no suggested-session
// algorithm exists yet, so the numbers here are illustrative, not computed
// from real due-card data. "Start session" is real navigation (/review,
// today's actual queue) — a dead primary action would be worse than an
// honest placeholder around it. "Adjust session" has no behavior yet.
//
// This is the one sanctioned reuse of the logo's stacked-card motif outside
// the mark itself (spec §4.2: "within the Today session hero when
// appropriate") — a signature, one-off component, not a card primitive. Do
// not lift this stack treatment into any other component.
//
// Stacking logic (rebuilt from a product-supplied target image + the actual
// logo mark, itera-mockups/{dashboard.png,logo.png} — not in this repo):
// each rear layer moves in its OWN direction and magnitude rather than all
// three sliding the same way by increasing amounts. A uniform diagonal fan
// reads as "one rectangle duplicated three times"; three independently
// tuned offsets read as a staggered, intentional stack.
//   - rear layer 1 (navy, closest) punches up-and-right: it's the only
//     layer that visibly clears the front card's top edge.
//   - rear layer 2 (deeper navy) mostly shifts right, barely above the top.
//   - rear layer 3 (pale) shifts right AND down, so it only ever shows at
//     the bottom-right/far-right, never at the top.
// The front card stays pinned at (0, 0) — i.e. anchored lower-left — and
// every rear layer moves away from it, never the reverse.

interface SessionHeroProps {
  cardCount?: number
  estimatedMinutes?: number
  topics?: string[]
}

// ---- Tunable values (desktop) ------------------------------------------
// Pixel offsets are applied via Tailwind arbitrary transforms directly on
// each layer below (search for "REAR LAYER 1/2/3"). This block is the
// at-a-glance reference for what's currently set; edit the classNames to
// change it.
//   rear layer 1 (navy,  closest):  x +28   y -20   rotate -1.2deg
//   rear layer 2 (deep navy):        x +56   y  -5   rotate -0.5deg
//   rear layer 3 (pale, furthest):   x +82   y +14   rotate +0.4deg
// --------------------------------------------------------------------------

function BracketMark({ variant, className }: { variant: 'top-right' | 'bottom-right'; className?: string }) {
  const d = variant === 'top-right' ? 'M9 4h13a2 2 0 0 1 2 2v9' : 'M9 28h13a2 2 0 0 0 2-2v-9'
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={cn('h-8 w-8', className)}>
      <path d={d} fill="none" stroke="#FF6902" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Echoes the real mark's three overlapping rounded-card facets (same
// rotation angles as the logo artwork) at watermark scale, right-half
// placement, deliberately bleeding past the card's edge so overflow-hidden
// crops it — matching the target's "partly cropped, integrated" watermark
// rather than a fully-contained decorative sticker.
function IteraSymbolWatermark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -right-10 -bottom-8 h-[300px] w-[300px] select-none sm:h-[340px] sm:w-[340px]"
    >
      <rect x="48" y="18" width="104" height="132" rx="16" fill="#fff" fillOpacity="0.075" transform="rotate(16 100 84)" />
      <rect x="34" y="50" width="104" height="132" rx="16" fill="#fff" fillOpacity="0.075" transform="rotate(-14 86 116)" />
      <rect x="62" y="62" width="104" height="132" rx="16" fill="#fff" fillOpacity="0.075" transform="rotate(34 114 128)" />
    </svg>
  )
}

export function SuggestedSessionHero({
  cardCount = 24,
  estimatedMinutes = 15,
  topics = ['C++', 'Type deduction', 'Storage duration'],
}: SessionHeroProps) {
  const [mounted, setMounted] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (mounted) return
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [mounted])

  return (
    <div className="group relative mt-6 mr-12 mb-4 sm:mt-8 sm:mr-20">
      {/* REAR LAYER 3 — pale, furthest back. Shifts right AND down only;
          never clears the front card's top edge. Hidden on mobile. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 hidden rounded-[20px] border border-black/5 bg-[#F1F3F6] shadow-[0_10px_24px_rgba(23,32,51,0.12)] transition-[opacity,transform] duration-300 ease-out sm:block',
          'translate-x-[82px] translate-y-[14px] rotate-[0.4deg]',
          mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
      />
      {/* REAR LAYER 2 — deeper navy. Mostly a right-side sliver, only a
          hair above the front card's top. Hidden on mobile. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 hidden rounded-[20px] border border-white/5 bg-[#162235] shadow-[0_12px_28px_rgba(23,32,51,0.24)] transition-[opacity,transform] duration-300 ease-out sm:block',
          'translate-x-[56px] -translate-y-[5px] rotate-[-0.5deg]',
          mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
        style={{ transitionDelay: mounted ? '50ms' : '0ms' }}
      />
      {/* REAR LAYER 1 — secondary navy, closest behind front. The one layer
          that clearly clears the top edge (top-right exposure). The only
          rear layer kept visible on mobile, at a reduced offset. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 rounded-[20px] border border-white/5 bg-[#243652] shadow-[0_14px_30px_rgba(23,32,51,0.28)] transition-[opacity,transform] duration-300 ease-out',
          'translate-x-[12px] -translate-y-[8px] rotate-[-0.8deg] sm:translate-x-[28px] sm:-translate-y-[20px] sm:rotate-[-1.2deg]',
          mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
        )}
        style={{ transitionDelay: mounted ? '90ms' : '0ms' }}
      />

      {/* Front content card — anchored at (0, 0); every rear layer moves
          away from it, so it reads as lower-left relative to the stack. */}
      <div
        className={cn(
          'relative z-10 overflow-hidden rounded-[20px] border border-white/[0.06] bg-itera-navy px-7 py-8 sm:min-h-[340px] sm:px-12 sm:py-10',
          'shadow-[0_24px_54px_rgba(23,32,51,0.28),0_4px_14px_rgba(23,32,51,0.14)]',
          'transition-[opacity,transform] duration-300 ease-out group-hover:-translate-y-0.5',
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        )}
        style={{ transitionDelay: mounted ? '140ms' : '0ms' }}
      >
        <IteraSymbolWatermark />
        <BracketMark variant="top-right" className="absolute top-5 right-5" />
        <BracketMark variant="bottom-right" className="absolute right-5 bottom-5" />

        <div className="relative max-w-md">
          <div className="text-[13px] font-semibold tracking-[0.06em] text-itera-accent uppercase">
            Today&rsquo;s session
          </div>
          <div className="mt-4 font-itera-display text-[40px] leading-none font-bold tracking-tight text-[#F8FAFC] sm:text-[56px]">
            {cardCount} cards
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[16px] text-[#F8FAFC]/78">
            <Clock size={16} />
            Approximately {estimatedMinutes} minutes
          </div>

          <div className="mt-6 border-t border-white/[0.12]" />

          <div className="mt-[22px] text-[16px] font-medium text-[#F8FAFC]/85">{topics.join(' · ')}</div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link
              to="/review"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-itera-accent px-7 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(255,105,2,0.32)] transition-all duration-150 ease-out hover:-translate-y-px hover:bg-itera-accent-hover motion-reduce:transition-none"
            >
              <Play size={16} className="fill-white" />
              Start session
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#F8FAFC]/60 transition-colors hover:text-[#F8FAFC]"
            >
              <SlidersHorizontal size={15} />
              Adjust session
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
