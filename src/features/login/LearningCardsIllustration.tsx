import { Code2, Database, Network, type LucideIcon } from 'lucide-react'

// The login page's product illustration: three Itera learning cards laid out
// as a restrained, editorial overlap. Real DOM, no raster art, no 3D
// perspective — each card is a plain rounded box with one 2D rotation.
//
// Geometry rules the arrangement follows (the reason the numbers below are
// hand-set rather than generated): every card keeps roughly the same
// width/height ratio (~0.72), they all lean the same way so they read as one
// object rather than scattered confetti, and the rotations stay under 10deg
// so nothing looks like it is flying out of the page. Front-to-back the navy
// card is nearest, then white, then orange, which is what the mockup draws.
//
// The overlap is bounded by a hard rule, not taste: a card may never cover
// the next card's *title*. Each card leans, so its right edge at the next
// card's title height sits further right than its own box does (by
// sin(rotation) x the vertical distance from its center) — which is why the
// gaps between `left` values look larger than the visible overlap. Widen a
// card or shift one left without re-checking that and a title starts
// disappearing behind its neighbour.
//
// Rotation is a literal `style.transform` string, not a Tailwind `rotate-*`
// utility: those compose transform through custom properties (see CLAUDE.md),
// and keeping one authored string per card also keeps the geometry readable.
//
// Decorative in full: the whole block is aria-hidden. Nothing here is real
// card data or persisted anywhere.

interface IllustrationCard {
  title: string
  body: string
  tag: string
  icon: LucideIcon
  /** The colored band behind the icon and title. `plain` is the white card. */
  header: 'navy' | 'plain' | 'orange'
  /** Position within the 520x300 illustration box, plus its lean. */
  left: number
  top: number
  width: number
  height: number
  rotate: number
  z: number
}

const CARDS: IllustrationCard[] = [
  {
    title: 'Dynamic Programming',
    body: 'Memoization, state transitions, and optimal substructure.',
    tag: 'Algorithms',
    icon: Code2,
    header: 'navy',
    left: 72,
    top: 62,
    width: 176,
    height: 244,
    rotate: -9,
    z: 3,
  },
  {
    title: 'SQL Joins',
    body: 'INNER, LEFT, RIGHT and FULL joins with examples.',
    tag: 'Databases',
    icon: Database,
    header: 'plain',
    left: 246,
    top: 26,
    width: 156,
    height: 236,
    rotate: -5,
    z: 2,
  },
  {
    title: 'System Design',
    body: 'Design scalable systems that are reliable and observable.',
    tag: 'Architecture',
    icon: Network,
    header: 'orange',
    left: 396,
    top: 16,
    width: 162,
    height: 240,
    rotate: -7,
    z: 1,
  },
]

const CARD_SHADOW =
  '0 18px 40px rgba(23, 32, 51, 0.10), 0 2px 8px rgba(23, 32, 51, 0.06)'

// Faint dot fields, as in the mockup: pure decoration that gives the cards
// something to sit against instead of empty canvas.
function DotGrid({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute"
      style={{
        backgroundImage: 'radial-gradient(#c3ccd9 1.6px, transparent 1.6px)',
        backgroundSize: '15px 15px',
        opacity: 0.75,
        ...style,
      }}
    />
  )
}

function Card({ card }: { card: IllustrationCard }) {
  const { icon: Icon, header } = card
  const banded = header !== 'plain'

  return (
    <div
      className="absolute overflow-hidden rounded-itera-card bg-itera-surface"
      style={{
        left: card.left,
        top: card.top,
        width: card.width,
        height: card.height,
        zIndex: card.z,
        transform: `rotate(${card.rotate}deg)`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <div
        className="px-4 pb-4 pt-4"
        style={{
          background:
            header === 'navy'
              ? 'var(--itera-navy)'
              : header === 'orange'
                ? 'var(--itera-accent)'
                : 'transparent',
        }}
      >
        <Icon
          size={23}
          strokeWidth={2.25}
          style={{
            color:
              header === 'navy'
                ? 'var(--itera-accent)'
                : header === 'orange'
                  ? '#ffffff'
                  : 'var(--itera-navy)',
          }}
        />
        <div
          className="mt-5 text-[13.5px] font-bold leading-tight tracking-tight"
          style={{ color: banded ? '#ffffff' : 'var(--itera-ink-brand)' }}
        >
          {card.title}
        </div>
      </div>

      <div className="px-4 pt-3">
        <p className="text-[10.5px] leading-[1.5] text-itera-muted">{card.body}</p>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
        <span
          className="rounded-itera-pill px-2 py-1 text-[10px] font-semibold"
          style={
            header === 'orange'
              ? { background: 'var(--itera-accent-soft)', color: 'var(--itera-accent)' }
              : { background: 'var(--itera-navy-soft)', color: 'var(--itera-ink-brand)' }
          }
        >
          {card.tag}
        </span>
        {/* Drawn rather than typed: a "•••" string sets its own tracking and
            renders far looser than the tight overflow affordance real Itera
            card rows use. */}
        <span className="flex items-center gap-[3px]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-itera-muted-light" />
          ))}
        </span>
      </div>
    </div>
  )
}

export function LearningCardsIllustration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative select-none"
      style={{ width: 580, height: 330 }}
    >
      <DotGrid style={{ left: 0, top: 182, width: 74, height: 74 }} />
      <DotGrid style={{ left: 500, top: 0, width: 80, height: 60 }} />
      {CARDS.map((card) => (
        <Card key={card.title} card={card} />
      ))}
    </div>
  )
}
