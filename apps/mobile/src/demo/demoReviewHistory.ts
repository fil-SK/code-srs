import {
  addCalendarDays,
  buildRange,
  buildReviewLog,
  computeRetention,
  reviewState,
  startOfDay,
  type Card,
  type ID,
  type Millis,
  type Rating,
  type ReviewLog,
  type SchedulingState,
} from '@itera/core'

// The demo's review history, replayed rather than asserted.
//
// This module authors only what a learner actually does: which card was
// answered, on which local day, at what time, with which rating, and how long
// it took. Every scheduling consequence - the state before and after, the
// stability and difficulty deltas, the next due date, and the card's *current*
// SchedulingState - is produced by running those inputs through the shared FSRS
// scheduler, exactly as a real review does.
//
// It used to author the outcomes too: each seed carried its own `stateBefore`
// and `state`, and the cards carried hand-written mature/learning scheduling
// beside them. Those two records disagreed for six of the twelve reviewed
// cards, so the workspace simultaneously claimed a card had graduated (its last
// log) and had not (its scheduling). Deriving both from one replay makes that
// class of contradiction unrepresentable rather than merely fixed.
//
// Days are offsets from the local day on which the workspace is created. That
// keeps the demo alive months from now and, unlike subtracting 86,400,000 ms,
// keeps reviews on their intended dates across DST changes.

/** One thing the learner did. Everything FSRS decides is deliberately absent. */
interface ReviewSeed {
  daysAgo: number
  hour: number
  minute: number
  rating: Rating
  durationMs: number
}

interface CardHistorySeed {
  cardId: ID
  /** Chronological, oldest first. */
  reviews: ReviewSeed[]
}

// FSRS's default learning steps are 1 minute and 10 minutes, so a card is
// introduced by working through those steps rather than by being declared
// mature: the first answer starts the card, the second graduates it to the
// "review" state, and the third is its first genuinely mature attempt. The
// minute offsets follow the steps, which is why an introduction reads as :mm,
// :mm+1, :mm+11.
const HISTORICAL_REVIEW_SEEDS: CardHistorySeed[] = [
  // ---- Modern C++ & Memory ---------------------------------------------------
  {
    cardId: 'fixture-card-value-categories',
    reviews: [
      { daysAgo: 28, hour: 8, minute: 30, rating: 3, durationMs: 34_000 },
      { daysAgo: 28, hour: 8, minute: 31, rating: 3, durationMs: 21_000 },
      { daysAgo: 28, hour: 8, minute: 41, rating: 3, durationMs: 18_000 },
      { daysAgo: 24, hour: 18, minute: 0, rating: 3, durationMs: 23_000 },
      { daysAgo: 13, hour: 8, minute: 40, rating: 1, durationMs: 37_000 },
      { daysAgo: 13, hour: 8, minute: 50, rating: 3, durationMs: 29_000 },
    ],
  },
  {
    cardId: 'fixture-card-ownership-trace',
    reviews: [
      { daysAgo: 28, hour: 8, minute: 32, rating: 3, durationMs: 41_000 },
      { daysAgo: 28, hour: 8, minute: 33, rating: 3, durationMs: 24_000 },
      { daysAgo: 28, hour: 8, minute: 43, rating: 3, durationMs: 20_000 },
      { daysAgo: 24, hour: 18, minute: 3, rating: 3, durationMs: 22_000 },
      { daysAgo: 3, hour: 8, minute: 15, rating: 3, durationMs: 20_000 },
    ],
  },
  {
    cardId: 'fixture-card-raii',
    reviews: [
      { daysAgo: 28, hour: 8, minute: 34, rating: 3, durationMs: 38_000 },
      { daysAgo: 28, hour: 8, minute: 35, rating: 3, durationMs: 26_000 },
      { daysAgo: 28, hour: 8, minute: 45, rating: 3, durationMs: 19_000 },
      { daysAgo: 24, hour: 18, minute: 6, rating: 3, durationMs: 26_000 },
      // A genuine lapse, recovered ten minutes later on the relearning step.
      { daysAgo: 13, hour: 8, minute: 42, rating: 1, durationMs: 34_000 },
      { daysAgo: 13, hour: 8, minute: 52, rating: 3, durationMs: 27_000 },
    ],
  },
  {
    cardId: 'fixture-card-smart-pointer-code',
    reviews: [
      { daysAgo: 6, hour: 12, minute: 20, rating: 3, durationMs: 52_000 },
      { daysAgo: 6, hour: 12, minute: 21, rating: 3, durationMs: 38_000 },
      { daysAgo: 6, hour: 12, minute: 31, rating: 3, durationMs: 31_000 },
    ],
  },

  // ---- Compilers & MLIR ------------------------------------------------------
  {
    cardId: 'fixture-card-ssa-definition',
    reviews: [
      { daysAgo: 28, hour: 9, minute: 0, rating: 3, durationMs: 36_000 },
      { daysAgo: 28, hour: 9, minute: 1, rating: 3, durationMs: 25_000 },
      { daysAgo: 28, hour: 9, minute: 11, rating: 3, durationMs: 21_000 },
      { daysAgo: 20, hour: 9, minute: 30, rating: 3, durationMs: 27_000 },
      { daysAgo: 10, hour: 7, minute: 55, rating: 1, durationMs: 31_000 },
      { daysAgo: 10, hour: 8, minute: 5, rating: 3, durationMs: 24_000 },
    ],
  },
  {
    cardId: 'fixture-card-dialect-lowering',
    reviews: [
      { daysAgo: 28, hour: 9, minute: 4, rating: 3, durationMs: 44_000 },
      { daysAgo: 28, hour: 9, minute: 5, rating: 3, durationMs: 29_000 },
      { daysAgo: 28, hour: 9, minute: 15, rating: 3, durationMs: 23_000 },
      { daysAgo: 20, hour: 9, minute: 33, rating: 3, durationMs: 25_000 },
      { daysAgo: 3, hour: 8, minute: 17, rating: 2, durationMs: 32_000 },
    ],
  },
  {
    cardId: 'fixture-card-pass-ordering',
    reviews: [
      { daysAgo: 28, hour: 9, minute: 8, rating: 3, durationMs: 33_000 },
      { daysAgo: 28, hour: 9, minute: 9, rating: 3, durationMs: 22_000 },
      { daysAgo: 28, hour: 9, minute: 19, rating: 3, durationMs: 18_000 },
      { daysAgo: 12, hour: 18, minute: 8, rating: 2, durationMs: 30_000 },
    ],
  },
  {
    cardId: 'fixture-card-dominance-order',
    reviews: [
      { daysAgo: 2, hour: 19, minute: 5, rating: 3, durationMs: 47_000 },
      { daysAgo: 2, hour: 19, minute: 6, rating: 3, durationMs: 33_000 },
      { daysAgo: 2, hour: 19, minute: 16, rating: 3, durationMs: 28_000 },
    ],
  },
  {
    cardId: 'fixture-card-peephole-code',
    reviews: [
      { daysAgo: 20, hour: 19, minute: 12, rating: 3, durationMs: 55_000 },
      { daysAgo: 20, hour: 19, minute: 13, rating: 3, durationMs: 40_000 },
      { daysAgo: 20, hour: 19, minute: 23, rating: 3, durationMs: 34_000 },
      { daysAgo: 13, hour: 8, minute: 45, rating: 1, durationMs: 41_000 },
      { daysAgo: 13, hour: 8, minute: 55, rating: 3, durationMs: 33_000 },
    ],
  },

  // ---- Algorithms & Problem Solving ------------------------------------------
  {
    cardId: 'fixture-card-loop-invariant',
    reviews: [
      { daysAgo: 28, hour: 19, minute: 0, rating: 3, durationMs: 32_000 },
      { daysAgo: 28, hour: 19, minute: 1, rating: 3, durationMs: 23_000 },
      { daysAgo: 28, hour: 19, minute: 11, rating: 3, durationMs: 19_000 },
      { daysAgo: 24, hour: 19, minute: 10, rating: 3, durationMs: 24_000 },
      // The one review on this day, which is what gives the retention chart a
      // real isolated observation to draw.
      { daysAgo: 18, hour: 19, minute: 10, rating: 1, durationMs: 35_000 },
      { daysAgo: 18, hour: 19, minute: 20, rating: 3, durationMs: 28_000 },
    ],
  },
  {
    cardId: 'fixture-card-rotated-search',
    reviews: [
      { daysAgo: 4, hour: 9, minute: 14, rating: 3, durationMs: 49_000 },
      { daysAgo: 4, hour: 9, minute: 15, rating: 3, durationMs: 35_000 },
      { daysAgo: 4, hour: 9, minute: 25, rating: 3, durationMs: 29_000 },
    ],
  },
  {
    cardId: 'fixture-card-amortized',
    reviews: [
      { daysAgo: 4, hour: 9, minute: 17, rating: 3, durationMs: 37_000 },
      { daysAgo: 4, hour: 9, minute: 18, rating: 3, durationMs: 26_000 },
      { daysAgo: 4, hour: 9, minute: 28, rating: 3, durationMs: 22_000 },
      { daysAgo: 1, hour: 9, minute: 20, rating: 4, durationMs: 19_000 },
    ],
  },
]

function materializeTime(now: Millis, seed: ReviewSeed): Millis {
  const date = new Date(addCalendarDays(startOfDay(now), -seed.daysAgo))
  date.setHours(seed.hour, seed.minute, 0, 0)
  return date.getTime()
}

/** One replayed review, still attached to the card it advanced. */
interface ReplayEvent {
  cardId: ID
  reviewedAt: Millis
  seed: ReviewSeed
}

export interface DemoReviewHistory {
  /** Canonical logs, in chronological order, with stable fixture ids. */
  logs: ReviewLog[]
  /**
   * The SchedulingState each reviewed card ended the replay in. A card absent
   * from this map was never reviewed and keeps its authored "new" state.
   */
  scheduling: Map<ID, SchedulingState>
}

/**
 * Replays the authored history over `cards`, which must still carry their
 * authored **new** scheduling.
 *
 * The result is causal in both directions: each log records the state the
 * shared scheduler actually moved the card through, and the returned scheduling
 * is the state that same scheduler left the card in. Nothing is asserted twice,
 * so `Card.scheduling` and the card's most recent log cannot disagree.
 */
export function createDemoReviewHistory(now: Millis, cards: Card[]): DemoReviewHistory {
  const scheduling = new Map<ID, SchedulingState>()
  for (const seed of HISTORICAL_REVIEW_SEEDS) {
    const card = cards.find((entry) => entry.id === seed.cardId)
    if (!card) throw new Error(`Demo review history references missing card ${seed.cardId}`)
    scheduling.set(seed.cardId, card.scheduling)
  }

  // Flattened and sorted once, so the replay runs in the order the learner
  // performed it and the fixture ids read chronologically. The card id is the
  // tie-break, because several introductions share a minute.
  const events: ReplayEvent[] = HISTORICAL_REVIEW_SEEDS.flatMap((history) =>
    history.reviews.map((seed) => ({
      cardId: history.cardId,
      reviewedAt: materializeTime(now, seed),
      seed,
    })),
  ).sort(
    (a, b) =>
      a.reviewedAt - b.reviewedAt || (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0),
  )

  const logs = events.map((event, index) => {
    const before = scheduling.get(event.cardId)!
    const after = reviewState(before, event.seed.rating, event.reviewedAt)
    scheduling.set(event.cardId, after)

    return {
      // The shared builder owns every field's meaning; only the id is replaced,
      // because newId() is random and this fixture has to be reproducible.
      ...buildReviewLog({
        cardId: event.cardId,
        before,
        after,
        rating: event.seed.rating,
        autoGraded: false,
        durationMs: event.seed.durationMs,
        now: event.reviewedAt,
      }),
      id: `fixture-review-${String(index + 1).padStart(3, '0')}`,
    }
  })

  return { logs, scheduling }
}

/**
 * Today's retention: mature attempts over the trailing 30 calendar days.
 *
 * The window is the one web's TodayPage uses, and it is built with core's own
 * `buildRange` so the boundaries are local midnights reached by calendar
 * stepping. Progress's KPI reads the same range through `computeKpis`, so the
 * two surfaces cannot report different retention for the same day - which they
 * did while Today read all of history and Progress read thirty days.
 *
 * The definition itself is untouched and still core's: mature attempts only
 * (`stateBefore` Review or Relearning), Hard or better counting as success.
 */
export function demoTodayRetention(logs: ReviewLog[], now: Millis): number | null {
  const range = buildRange('30d', now)
  return computeRetention(
    logs.filter((log) => log.reviewedAt >= range.from && log.reviewedAt < range.to),
  )
}
