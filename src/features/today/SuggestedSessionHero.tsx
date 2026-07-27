import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Clock, Play, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import iteraSymbolMask from '@/assets/itera-symbol-mask.png'

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
// Stack geometry: every rear layer has its own width, height, offset, and
// rotation (not a shared box translated by increasing amounts). Sizes are
// still tuned so no rear layer's bottom edge drops below the front card's —
// the front card alone controls the bottom/left silhouette — but rotation
// is now deliberately pronounced (per product-owner direction, not a subtle
// "nearly parallel" stack) for visible asymmetry. Percentages are relative
// to the front card's own box (the wrapper has no padding, so its content
// box equals the front card's rendered size), which keeps proportions
// consistent at every breakpoint without separate mobile numbers — it's
// also why the vertical-only height trim below (desktop vertical padding
// 46px->32px, two internal gaps tightened 4px each) needed no changes to
// any rear layer's own left/top/width/height/rotate/translateX: shrinking
// the front card's rendered height automatically shrinks every
// percentage-sized rear layer with it. The wrapper's mt/mb were scaled down
// to match (mt 65->59, mb 44->40); mr (92, horizontal) was left untouched
// per "preserve the approved horizontal composition." Cards are numbered
// front-to-back as the product owner refers to them (#1 = front):
//   #2 (navy #243652): starts at card #1's exact box (same position, same
//     size, unrotated), then translateX(35px) translateY(-20px) and
//     rotate(3.5deg) — a single move-and-twist, not an independently-sized
//     rectangle.
//   #3 (deep navy #17243A): left +8.3%  top -2.1%  w 100.0% h 92.4%  rotate -5deg
//     -> barely clears the top; reads mainly as a right-edge sliver.
//   #4 (pale #D9DEE5):      left +11.6% top +4.1%  w 99.2%  h 82.9%  rotate +0.15deg
//     -> starts below the front card's own top, so it never appears above
//        it — only a narrow accent at the far right. Position matches the
//        original placement; only the color was darkened from #F1F3F6 (it
//        blended almost invisibly into the page canvas) to a visible gray.
// itera-symbol-mask.png (src/assets) is a real alpha-channel silhouette
// derived from the actual Itera logo artwork (itera-mockups/logo.png, not
// in this repo — background thresholded to alpha, not an approximation
// built from CSS shapes), used as a CSS mask so its color/opacity are
// controlled here directly.

interface SessionHeroProps {
  cardCount?: number
  estimatedMinutes?: number
  topics?: string[]
}

// Horizontal stroke is ~2x the vertical one (24 vs 9 units) — a wide flat
// bracket rather than a near-square corner.
function BracketMark({ variant, className }: { variant: 'top-right' | 'bottom-right'; className?: string }) {
  const d = variant === 'top-right' ? 'M6 4h24a2 2 0 0 1 2 2v9' : 'M6 28h24a2 2 0 0 0 2-2v-9'
  return (
    <svg aria-hidden="true" viewBox="0 0 44 32" className={cn('h-[27px] w-[37px]', className)}>
      <path d={d} fill="none" stroke="#FF6902" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IteraSymbolWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-6 -bottom-[45px] h-[260px] w-[260px] select-none"
      style={{
        opacity: 0.055,
        background: 'rgba(255,255,255,0.95)',
        maskImage: `url(${iteraSymbolMask})`,
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        maskSize: 'contain',
        WebkitMaskImage: `url(${iteraSymbolMask})`,
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        WebkitMaskSize: 'contain',
      }}
    />
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

  // The four layers reveal on a stagger (0/50/90/140ms delays below) so
  // they visibly cascade in on first mount. That per-layer delay must NOT
  // carry over into the hover-zoom transition below, or the four cards
  // visibly zoom at different moments instead of as one object. `settled`
  // flips once, shortly after the longest reveal transition (140ms delay +
  // 300ms duration) would have finished, and forces every layer's delay to
  // 0ms from then on — so hover always fires all four in perfect sync.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => setSettled(true), 480)
    return () => clearTimeout(t)
  }, [mounted])
  const revealDelay = (staggerMs: number) => (settled ? '0ms' : mounted ? `${staggerMs}ms` : '0ms')

  // Hover-driven zoom is tracked in JS (not CSS group-hover) and baked into
  // each layer's literal `transform` string alongside its rotate/translate,
  // rather than expressed as separate Tailwind scale/rotate utility classes.
  // Those utilities compose transform via CSS custom properties, and a
  // `transition: transform` on a custom-property-driven transform doesn't
  // reliably interpolate — it was measured snapping instantly despite a
  // correct transition-duration. A literal inline `transform` string (the
  // same mechanism the mount-in reveal already used, which does animate
  // correctly) sidesteps that.
  const [hovered, setHovered] = useState(false)
  const hoverScale = (base: number) => (!mounted ? base : hovered ? 1.02 : 1)

  const revealBase = 'transition-[opacity,transform] duration-300 ease-out'

  return (
    <div
      className="relative mt-[59px] mr-[92px] mb-[12px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* card #4 — pale, furthest back. Nudged further right (was 11.6%)
          and darkened toward a visible gray (was #F1F3F6, blended almost
          into the page canvas) so it actually reads as its own layer.
          Starts below the front card's own top, so it never peeks above
          it. Hidden on mobile. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute hidden rounded-[21px] border border-[rgba(30,41,59,0.12)] bg-[#D9DEE5] shadow-[0_5px_13px_rgba(15,23,42,0.05)] sm:block',
          revealBase,
        )}
        style={{
          left: '11.6%',
          top: '4.1%',
          width: '99.2%',
          height: '82.9%',
          transform: `rotate(0.15deg) scale(${hoverScale(0.97)})`,
          opacity: mounted ? 1 : 0,
        }}
      />
      {/* card #3 — deep navy. Rotated 5deg counterclockwise for asymmetry. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute hidden rounded-[21px] border border-white/5 bg-[#17243A] shadow-[0_6px_15px_rgba(15,23,42,0.07)] sm:block',
          revealBase,
        )}
        style={{
          left: '8.3%',
          top: '-2.1%',
          width: '100%',
          height: '92.4%',
          transform: `rotate(-5deg) scale(${hoverScale(0.97)})`,
          opacity: mounted ? 1 : 0,
          transitionDelay: revealDelay(50),
        }}
      />
      {/* card #2 — navy. Starts at the exact same box as card #1 (same
          position, same size, unrotated), then translateX(35px)
          translateY(-20px) and rotate(3.5deg) — a single move-and-twist
          rather than an independently-tuned rectangle. (35px = the
          original 30px plus the 5px rightward nudge shared with card #1;
          -20px is shared with card #1's 20px-up nudge, so the two stay in
          the same relative alignment.) */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute rounded-[21px] border border-white/5 bg-[#243652] shadow-[0_8px_18px_rgba(15,23,42,0.08)]',
          revealBase,
        )}
        style={{
          left: '0%',
          top: '0%',
          width: '100%',
          height: '100%',
          transform: `translateX(35px) translateY(-20px) rotate(3.5deg) scale(${hoverScale(0.97)})`,
          opacity: mounted ? 1 : 0,
          transitionDelay: revealDelay(90),
        }}
      />

      {/* card #1 — front content card, unrotated, dominant, controls the
          left and bottom silhouette entirely. Sits a touch higher than
          resting-flush (-28px total: the original -8px plus a 20px-up
          nudge shared with card #2) so it reads as placed above the stack,
          and a constant 5px right of the wrapper's origin (shared with
          card #2's extra 5px, so the pair's relative alignment is
          unchanged). Hover no longer lifts just this card — all four
          layers zoom in together by the same small scale factor, so the
          whole stack comes into focus as one object. */}
      <div
        className={cn(
          'relative z-10 overflow-hidden rounded-[21px] border border-white/[0.08] px-7 py-8 sm:min-h-[310px] sm:px-[50px] sm:py-[32px]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_34px_rgba(15,23,42,0.16),0_3px_8px_rgba(15,23,42,0.08)]',
          'transition-[opacity,transform] duration-300 ease-out',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: 'linear-gradient(118deg, #1E293B 0%, #1C2A40 58%, #18243A 100%)',
          transform: `translateX(5px) translateY(${mounted ? -28 : -12}px) scale(${hoverScale(1)})`,
          transitionDelay: revealDelay(140),
        }}
      >
        <IteraSymbolWatermark />
        <BracketMark variant="top-right" className="absolute top-5 right-[22px]" />
        <BracketMark variant="bottom-right" className="absolute right-[22px] bottom-[22px]" />

        <div className="relative max-w-md">
          <div className="text-[13px] font-semibold tracking-[0.06em] text-itera-accent uppercase">
            Today&rsquo;s session
          </div>
          <div className="mt-4 font-itera-display text-[40px] leading-[0.95] font-bold tracking-tight text-white sm:text-[56px]">
            {cardCount} cards
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[16px] text-[rgba(248,250,252,0.72)]">
            <Clock size={16} />
            Approximately {estimatedMinutes} minutes
          </div>

          <div className="mt-5 border-t border-[rgba(255,255,255,0.12)]" />

          <div className="mt-[22px] text-[16px] font-medium text-[#F8FAFC]/85">{topics.join(' · ')}</div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <Link
              to="/review"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[9px] bg-[#FF6902] px-7 text-[16px] font-semibold text-white shadow-[0_8px_18px_rgba(255,105,2,0.22)] transition-all duration-150 ease-out hover:-translate-y-px hover:bg-[#F66200] hover:shadow-[0_10px_22px_rgba(255,105,2,0.25)] motion-reduce:transition-none"
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
