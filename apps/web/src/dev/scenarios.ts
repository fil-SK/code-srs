import type { BackupData, Card, CardInteraction, Deck, ReviewLog, Rating, SchedulingStateKind } from '@fliptap/core'
import { richText } from '@fliptap/core'

// Dev-only starting points for the web app. Each scenario is generated, not
// stored, so "start again" always produces the same workspace: the random
// source is seeded and every id is derived from a fixed prefix.
//
// `now` is a parameter so tests can pin the clock. The page passes Date.now().

export type ScenarioId = 'blank' | 'veteran'

export interface ScenarioDefinition {
  id: ScenarioId
  label: string
  summary: string
  build: (now: number) => BackupData
}

// mulberry32: a tiny seeded PRNG, enough for varied-but-repeatable fixtures.
function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY = 24 * 60 * 60 * 1000

function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function emptyScheduling(due: number) {
  return {
    due,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    learningSteps: 0,
    state: 'new' as SchedulingStateKind,
  }
}

const TOPICS: Array<{ name: string; language: string; cards: Array<[string, string]> }> = [
  {
    name: 'C++ Fundamentals',
    language: 'cpp',
    cards: [
      ['What does RAII stand for and what does it tie to?', 'Resource Acquisition Is Initialization: resource lifetime is tied to object lifetime.'],
      ['What does `const` on a member function promise?', 'That the function does not modify the object\'s observable state.'],
      ['When is the move constructor selected?', 'When the argument is an rvalue, such as a temporary or a std::move result.'],
      ['What is the difference between `struct` and `class` defaults?', 'Members of a struct are public by default; members of a class are private.'],
      ['What does `explicit` prevent?', 'Implicit conversions through a single-argument constructor.'],
      ['Why should destructors be virtual in base classes?', 'So deleting through a base pointer runs the derived destructor.'],
      ['What is undefined about signed integer overflow?', 'It is undefined behaviour in C++, so the compiler may assume it never happens.'],
      ['What does `noexcept` promise?', 'That the function will not throw; a throw calls std::terminate.'],
    ],
  },
  {
    name: 'Compilers',
    language: 'text',
    cards: [
      ['What does the lexer produce?', 'A stream of tokens from the source characters.'],
      ['What is a parse tree versus an AST?', 'A parse tree keeps every grammar step; an AST keeps only the meaningful structure.'],
      ['What is register allocation?', 'Assigning program values to a limited set of machine registers, spilling when needed.'],
      ['What is SSA form?', 'Static single assignment: each variable is assigned exactly once.'],
      ['What does constant folding do?', 'Evaluates constant expressions at compile time.'],
    ],
  },
  {
    name: 'Software Engineering',
    language: 'text',
    cards: [
      ['What does the Liskov substitution principle require?', 'Subtypes must be usable wherever their base type is expected without breaking behaviour.'],
      ['What is a race condition?', 'Program correctness depending on the timing or interleaving of concurrent operations.'],
      ['What is idempotency in an HTTP method?', 'Repeating the request leaves the server in the same state as one request.'],
      ['What does a database index trade off?', 'Faster reads on the indexed columns in exchange for slower writes and more storage.'],
      ['What is cache invalidation?', 'Removing or refreshing cached entries when the underlying data changes.'],
      ['What does eventual consistency mean?', 'Replicas converge to the same value if writes stop, but may disagree for a while.'],
    ],
  },
  {
    name: 'Algorithms',
    language: 'text',
    cards: [
      ['What is the average complexity of hash table lookup?', 'O(1) on average, O(n) in the worst case.'],
      ['What invariant does binary search keep?', 'The target, if present, lies within the current search range.'],
      ['What is the time complexity of merge sort?', 'O(n log n) in every case.'],
      ['When is a BFS preferred over a DFS?', 'When the shortest path in an unweighted graph is needed.'],
    ],
  },
]

function buildVeteran(now: number): BackupData {
  const rand = seededRandom(20260)
  const today = startOfLocalDay(now)
  const createdAt = today - 24 * DAY

  const decks: Deck[] = []
  const cards: Card[] = []

  // One parent deck with two children, so the nested tree and the Library
  // hierarchy get exercised, plus the flat topics beside it.
  const parentId = 'dev-deck-cpp'
  decks.push({ id: parentId, name: 'Programming', createdAt, updatedAt: now })
  let cardSeq = 0
  for (const [topicIndex, topic] of TOPICS.entries()) {
    const deckId = topicIndex === 0 ? parentId : `dev-deck-${topicIndex}`
    if (topicIndex !== 0) {
      decks.push({
        id: deckId,
        name: topic.name,
        parentId: topicIndex === 1 ? undefined : parentId,
        language: topic.language,
        createdAt,
        updatedAt: now,
      })
    } else {
      // The parent carries its first topic's cards directly, so it is not empty.
    }
    for (const [prompt, answer] of topic.cards) {
      cardSeq += 1
      const id = `dev-card-${String(cardSeq).padStart(3, '0')}`
      // Spread due dates across overdue, due today, and the coming weeks.
      const offsetDays = Math.round(rand() * 24) - 5
      const interaction: CardInteraction = {
        type: 'recall',
        answer: richText(answer),
      }
      cards.push({
        id,
        schemaVersion: 2,
        deckId,
        prompt: richText(prompt),
        interaction,
        tags: [topic.name.toLowerCase().replace(/\s+/g, '-')],
        createdAt: createdAt + cardSeq * 60_000,
        updatedAt: now,
        suspended: cardSeq % 17 === 0,
        scheduling: {
          ...emptyScheduling(today + offsetDays * DAY + 9 * 60 * 60 * 1000),
          stability: 2 + rand() * 40,
          difficulty: 3 + rand() * 4,
          elapsedDays: 1 + Math.round(rand() * 10),
          scheduledDays: 1 + Math.round(rand() * 30),
          reps: 2 + Math.round(rand() * 10),
          lapses: Math.round(rand() * 2),
          state: 'review',
          lastReview: today - 3 * DAY,
        },
      })
    }
  }

  // About three weeks of history. Most days have sessions, a few are skipped so
  // the streak and the heat map show real gaps, and ratings skew toward Good.
  const reviewLogs: ReviewLog[] = []
  let logSeq = 0
  for (let day = 21; day >= 1; day -= 1) {
    if (day % 9 === 0) continue
    const dayStart = today - day * DAY
    const sessionSize = 4 + Math.round(rand() * 10)
    for (let i = 0; i < sessionSize; i += 1) {
      const card = cards[Math.floor(rand() * cards.length)]
      const roll = rand()
      const rating: Rating = roll < 0.12 ? 1 : roll < 0.25 ? 2 : roll < 0.85 ? 3 : 4
      const reviewedAt = dayStart + (8 + Math.floor(rand() * 12)) * 60 * 60 * 1000 + i * 45_000
      const stability = 1 + rand() * 30
      logSeq += 1
      reviewLogs.push({
        id: `dev-log-${String(logSeq).padStart(5, '0')}`,
        cardId: card.id,
        reviewedAt,
        rating,
        autoGraded: rand() < 0.4,
        durationMs: 8_000 + Math.round(rand() * 40_000),
        stabilityBefore: stability,
        stabilityAfter: stability * (rating >= 3 ? 1.6 : 0.7),
        difficultyBefore: 5,
        difficultyAfter: rating === 1 ? 6 : 5,
        stateBefore: 'review',
        state: 'review',
        dueAfter: reviewedAt + (rating >= 3 ? 3 : 1) * DAY,
      })
    }
  }

  return { cards, decks, drafts: [], reviewLogs, roadmaps: [] }
}

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'blank',
    label: 'Brand new user',
    summary: 'Nothing in the workspace: no decks, cards or history.',
    build: () => ({ cards: [], decks: [], drafts: [], reviewLogs: [], roadmaps: [] }),
  },
  {
    id: 'veteran',
    label: 'Long-time user',
    summary: 'Four topic decks with a nested child, 23 cards, three weeks of reviews, and a broken streak.',
    build: buildVeteran,
  },
]

export function findScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
