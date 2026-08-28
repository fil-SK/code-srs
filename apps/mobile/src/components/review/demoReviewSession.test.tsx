import { getRepository, type Rating } from '@itera/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'

import { DemoReviewSession } from '@/src/components/review/DemoReviewSession'
import { createDemoQueue } from '@/src/demo/demoQueue'
import { createDemoSeed } from '@/src/demo/demoWorkspace'
import type { DemoEntities } from '@/src/demo/demoEntities'
import {
  demoDeckViewModel,
  demoLibraryViewModel,
  demoProgressViewModel,
  demoTodayViewModel,
} from '@/src/demo/demoSelectors'
import { demoStartedAt } from '@/src/demo/demoRuntime'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'
import { useDemoEntities } from '@/src/demo/demoEntities'
import { createTestQueryClient, settleQueries } from '@/src/test/demoHarness'
import { mockReducedMotion } from '@/src/test/reviewHarness'

// The session over the real composed demo runtime: queue, progress, completion,
// undo, and what all of that leaves behind.
//
// Scoped to one deck so a whole session is a handful of cards. The per-type
// behavior is covered by the six interaction files; what is asserted here is the
// wiring between the queue, the shared scheduler and the repository.
//
// Two probes, deliberately. `entities` is what the shared query hooks currently
// see, so an assertion on it can only pass if an invalidation actually
// re-rendered a consumer - that is the reactivity claim. `demo` is the
// demo-runtime provider (clock, inbox, reset), which no longer holds entities at
// all.

mockReducedMotion()
afterEach(cleanup)

const DECK = 'fixture-modern-cpp'

let demo: DemoWorkspaceValue
let entities: DemoEntities

function Probe() {
  demo = useDemoWorkspace()
  const seen = useDemoEntities()
  entities = { decks: seen.decks, cards: seen.cards, reviewLogs: seen.reviewLogs }
  return null
}

/**
 * Mirrors the route: the session takes the entities the hooks read, and must
 * not mount until they have arrived, or it would snapshot an empty queue.
 */
function Session({ deckId, onExit }: { deckId?: string; onExit: () => void }) {
  const { decks, cards, reviewLogs, isLoading } = useDemoEntities()
  if (isLoading) return null
  return (
    <DemoReviewSession deckId={deckId} entities={{ decks, cards, reviewLogs }} onExit={onExit} />
  )
}

function renderSessionFor(deckId: string | undefined) {
  const exits = { count: 0 }
  const view = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoWorkspaceProvider>
        <Probe />
        <Session
          deckId={deckId}
          onExit={() => {
            exits.count += 1
          }}
        />
      </DemoWorkspaceProvider>
    </QueryClientProvider>,
  )
  return { ...view, exits }
}

/** The deck-scoped session most of this file drives. */
function renderSession(deckId: string = DECK) {
  return renderSessionFor(deckId)
}

/** The all-decks session the Review tab starts. */
function renderAllDecksSession() {
  return renderSessionFor(undefined)
}

/** Answers whatever card is showing, then rates it. */
async function answerAndRate(rating: Rating = 3) {
  const flip = screen.queryByLabelText('Recall card, question showing')
  if (flip) {
    fireEvent.press(flip)
  } else {
    const editor = screen.queryByLabelText(/answer editor$/)
    if (editor) {
      fireEvent.changeText(editor, 'anything at all')
    } else {
      const options = screen.queryAllByRole('checkbox').concat(screen.queryAllByRole('radio'))
      if (options.length > 0) fireEvent.press(options[0])
    }
    const submit = screen.queryByText('Submit answer')
    if (submit) fireEvent.press(submit)
  }
  await settleQueries()

  const labels: Record<Rating, RegExp> = {
    1: /^Again,/,
    2: /^Hard,/,
    3: /^Good,/,
    4: /^Easy,/,
  }
  fireEvent.press(screen.getByLabelText(labels[rating]))
  await settleQueries()
}

/**
 * Sorted by id, because `cards.search` orders by `updatedAt` the way Dexie does.
 * That ordering is correct and is not what these assertions are about.
 */
function byId<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

function queueNow() {
  return createDemoQueue(entities, { now: demo.now, deckId: DECK })
}

describe('a demo review session', () => {
  it('opens on the first card of a deterministic queue', async () => {
    renderSession()
    await settleQueries()

    const queue = queueNow()
    expect(queue.length).toBeGreaterThan(1)
    expect(screen.getByLabelText(`Card 1 of ${queue.length}`)).toBeTruthy()
  })

  it('queues only cards the deck scope covers', async () => {
    renderSession()
    await settleQueries()

    const queue = queueNow()
    const outside = entities.cards.filter((card) => card.deckId !== DECK)

    expect(queue.length).toBeGreaterThan(0)
    expect(outside.length).toBeGreaterThan(0)
    for (const card of queue) expect(card.deckId).toBe(DECK)
    for (const card of outside) expect(queue.some((entry) => entry.id === card.id)).toBe(false)
  })

  it('advances to the next card after a rating', async () => {
    renderSession()
    await settleQueries()
    const total = queueNow().length

    await answerAndRate()

    expect(screen.getByLabelText(`Card 2 of ${total}`)).toBeTruthy()
  })

  it('appends exactly one ReviewLog per graded card', async () => {
    renderSession()
    await settleQueries()
    const seeded = entities.reviewLogs.length

    await answerAndRate()
    expect(entities.reviewLogs).toHaveLength(seeded + 1)

    await answerAndRate()
    expect(entities.reviewLogs).toHaveLength(seeded + 2)
  })

  it('commits the graded card and its log to the repository as one result', async () => {
    renderSession()
    await settleQueries()

    const first = queueNow()[0]
    const before = first.scheduling

    await answerAndRate()

    // Read from the repository, not from a rendered tree: this asserts what was
    // actually written through commitReview.
    const repo = getRepository()
    const stored = await repo.cards.getById(first.id)
    const logs = await repo.reviews.all()
    const after = stored!.scheduling

    expect(after.reps).toBe(before.reps + 1)
    expect(after.due).toBeGreaterThan(before.due)
    // The log and the card agree, because both come from the one computed
    // result rather than being derived twice.
    expect(logs.at(-1)?.dueAfter).toBe(after.due)
    expect(logs.at(-1)?.stabilityAfter).toBe(after.stability)
    expect(logs.at(-1)?.cardId).toBe(first.id)
  })

  it('stops the graded card being due', async () => {
    renderSession()
    await settleQueries()

    const first = queueNow()[0]
    await answerAndRate(4)

    expect(queueNow().some((entry) => entry.id === first.id)).toBe(false)
  })

  it('reacts across Today, Progress, and Library after a grade', async () => {
    renderSession()
    await settleQueries()
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const beforeToday = demoTodayViewModel(entities, greeting, demo.now)
    const beforeProgress = demoProgressViewModel(entities, demo.now)
    const beforeLibrary = demoLibraryViewModel(entities, demo.now)

    await answerAndRate(4)

    const afterToday = demoTodayViewModel(entities, greeting, demo.now)
    const afterProgress = demoProgressViewModel(entities, demo.now)
    const afterLibrary = demoLibraryViewModel(entities, demo.now)
    const reviews = (model: typeof beforeProgress) =>
      Number(model.metrics.find((metric) => metric.id === 'reviews')?.value)

    expect(afterToday.dueToday).toBe(beforeToday.dueToday - 1)
    expect(reviews(afterProgress)).toBe(reviews(beforeProgress) + 1)
    expect(afterProgress.activityDays.at(-1)?.count).toBe(
      (beforeProgress.activityDays.at(-1)?.count ?? 0) + 1,
    )
    expect(afterProgress.metrics.find((metric) => metric.id === 'due')?.value).toBe(
      String(afterToday.dueToday),
    )
    expect(afterLibrary.decks.find((deck) => deck.id === DECK)?.dueCount).toBe(
      (beforeLibrary.decks.find((deck) => deck.id === DECK)?.dueCount ?? 0) - 1,
    )
  })

  it('ignores a duplicate commit instead of recording the same review twice', async () => {
    renderSession()
    await settleQueries()
    await answerAndRate(4)

    const repo = getRepository()
    const logs = await repo.reviews.all()
    const last = logs.at(-1)!
    const card = (await repo.cards.getById(last.cardId))!

    await repo.commitReview({ card, log: last })

    expect(await repo.reviews.all()).toHaveLength(logs.length)
  })

  it('records the pre-grade state on the log, not the post-grade one', async () => {
    renderSession()
    await settleQueries()
    const first = queueNow()[0]
    const stateBefore = first.scheduling.state

    await answerAndRate()

    expect(entities.reviewLogs.at(-1)?.stateBefore).toBe(stateBefore)
    expect(entities.reviewLogs.at(-1)?.cardId).toBe(first.id)
  })

  it('moves the originating deck s own metrics, and Undo moves them back', async () => {
    renderSession()
    await settleQueries()
    const deckBefore = demoDeckViewModel(entities, DECK, demo.now)!
    const first = queueNow()[0]

    await answerAndRate(4)

    const deckAfter = demoDeckViewModel(entities, DECK, demo.now)!
    expect(deckAfter.dueCount).toBe(deckBefore.dueCount - 1)
    expect(deckAfter.cardCount).toBe(deckBefore.cardCount)

    const logId = entities.reviewLogs.at(-1)!.id
    await act(async () => {
      await getRepository().revertReview({ card: first, logId })
    })
    // Reverting behind the hooks does not invalidate, so re-read the store.
    const restored = await getRepository().cards.search({ includeSuspended: true })
    const decks = await getRepository().decks.getAll()
    const logs = await getRepository().reviews.all()

    // The deck screen recomputes from the entities, so there is nothing to
    // reverse on it - reversing the data is the whole of the fix.
    expect(demoDeckViewModel({ decks, cards: restored, reviewLogs: logs }, DECK, demo.now)).toEqual(
      deckBefore,
    )
  })

  it('reaches a completion screen once the queue is exhausted', async () => {
    renderSession()
    await settleQueries()
    const total = queueNow().length

    for (let i = 0; i < total; i++) await answerAndRate()

    expect(screen.getByText('Session complete')).toBeTruthy()
    expect(screen.getByText(`You reviewed ${total} of ${total} cards.`)).toBeTruthy()
  })

  it('exits from the completion screen', async () => {
    const { exits } = renderSession()
    await settleQueries()
    const total = queueNow().length

    for (let i = 0; i < total; i++) await answerAndRate()
    fireEvent.press(screen.getByText('Done'))

    expect(exits.count).toBe(1)
  })

  it('undoes exactly the last card, restoring its recorded state', async () => {
    renderSession()
    await settleQueries()
    const queue = queueNow()
    const last = queue[queue.length - 1]
    const lastBefore = last.scheduling
    const seeded = entities.reviewLogs.length

    for (let i = 0; i < queue.length - 1; i++) await answerAndRate()
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const metricsBeforeLast = demoProgressViewModel(entities, demo.now)
    const todayBeforeLast = demoTodayViewModel(entities, greeting, demo.now)
    await answerAndRate()
    expect(entities.reviewLogs).toHaveLength(seeded + queue.length)

    fireEvent.press(screen.getByLabelText('Undo last card'))
    await settleQueries()

    expect(entities.reviewLogs).toHaveLength(seeded + queue.length - 1)
    expect(entities.cards.find((entry) => entry.id === last.id)!.scheduling).toEqual(lastBefore)
    expect(demoProgressViewModel(entities, demo.now)).toEqual(metricsBeforeLast)
    expect(demoTodayViewModel(entities, greeting, demo.now)).toEqual(todayBeforeLast)
    // The other cards keep their new schedules; undo is one level, not a reset.
    expect(entities.reviewLogs.filter((log) => log.cardId === last.id)).toHaveLength(
      entities.reviewLogs.slice(0, seeded).filter((log) => log.cardId === last.id).length,
    )
  })

  it('offers no Undo before anything has been graded', async () => {
    renderSession()
    await settleQueries()

    fireEvent.press(screen.getByLabelText('Exit review session'))
    expect(screen.queryByLabelText('Undo last card')).toBeNull()
  })

  it('exits mid-session without recording anything', async () => {
    const { exits } = renderSession()
    await settleQueries()
    const seeded = entities.reviewLogs.length

    fireEvent.press(screen.getByLabelText('Exit review session'))

    expect(exits.count).toBe(1)
    expect(entities.reviewLogs).toHaveLength(seeded)
  })

  it('shows an honest caught-up state when the deck has nothing due', async () => {
    renderSession('fixture-computer-networks')
    await settleQueries()

    expect(screen.getByText('All caught up')).toBeTruthy()
    // Nothing is repopulated to keep the demo interesting: the seeded history
    // is still exactly the seeded history. Compared against a fresh seed rather
    // than a literal, so the fixture can grow without editing this.
    expect(entities.reviewLogs).toEqual(createDemoSeed(demoStartedAt()).reviewLogs)
  })

  it('restores the original dataset on a demo reset', async () => {
    renderSession()
    await settleQueries()
    const first = queueNow()[0]
    const originalScheduling = first.scheduling
    const originalLogs = entities.reviewLogs
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const originalToday = demoTodayViewModel(entities, greeting, demo.now)
    const originalProgress = demoProgressViewModel(entities, demo.now)

    await answerAndRate()
    expect(entities.reviewLogs).toHaveLength(originalLogs.length + 1)

    act(() => demo.resetDemoWorkspace())
    await settleQueries()

    expect(entities.reviewLogs).toEqual(originalLogs)
    const restored = entities.cards.find((entry) => entry.id === first.id)!.scheduling
    expect(restored.reps).toBe(originalScheduling.reps)
    expect(restored.state).toBe(originalScheduling.state)
    expect(demoTodayViewModel(entities, greeting, demo.now)).toEqual(originalToday)
    expect(demoProgressViewModel(entities, demo.now)).toEqual(originalProgress)
  })

  it('can move one notification in both directions without screen-local state', async () => {
    renderSession()
    await settleQueries()
    const notification = demo.notifications.find((item) => !item.unread)!

    act(() => demo.markNotificationUnread(notification.id))
    await settleQueries()
    expect(demo.notifications.find((item) => item.id === notification.id)?.unread).toBe(true)

    act(() => demo.markNotificationRead(notification.id))
    await settleQueries()
    expect(demo.notifications.find((item) => item.id === notification.id)?.unread).toBe(false)
  })

  // The reset is what makes repeated recordings possible: a demo is run, cards
  // are graded, notifications are opened, and the next take has to start from
  // the same frame as the first. This drives a whole session to completion and
  // marks the inbox read before resetting, then compares the whole dataset
  // against a fresh seed rather than spot-checking the fields that were touched.
  it('restores the exact starting state after a full session and a read inbox', async () => {
    renderSession()
    await settleQueries()
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const pristine = createDemoSeed(demoStartedAt())

    const queueLength = queueNow().length
    expect(queueLength).toBeGreaterThan(1)
    for (let index = 0; index < queueLength; index += 1) await answerAndRate()
    await settleQueries()

    expect(screen.getByText('Session complete')).toBeTruthy()
    act(() => demo.markAllNotificationsRead())
    await settleQueries()

    // Everything moved: scheduling, history, the inbox and every derived screen.
    expect(entities.reviewLogs.length).toBe(pristine.reviewLogs.length + queueLength)
    expect(demo.notifications.every((item) => !item.unread)).toBe(true)
    expect(byId(entities.cards)).not.toEqual(byId(pristine.cards))

    act(() => demo.resetDemoWorkspace())
    await settleQueries()

    expect(byId(entities.decks)).toEqual(byId(pristine.decks))
    expect(byId(entities.cards)).toEqual(byId(pristine.cards))
    expect(entities.reviewLogs).toEqual(pristine.reviewLogs)
    expect(demo.notifications).toEqual(pristine.notifications)
    expect(demoTodayViewModel(entities, greeting, demo.now)).toEqual(
      demoTodayViewModel(pristine, greeting, demo.now),
    )
    expect(demoProgressViewModel(entities, demo.now)).toEqual(
      demoProgressViewModel(pristine, demo.now),
    )
  })
})

describe('a session with no deck scope', () => {
  // The all-decks session the Review tab starts. Everything else in this file
  // is deck-scoped, which would leave the unscoped path - the one the primary
  // Review entry point uses - proven only at the queue helper.
  it('draws from every deck and commits its grade like a scoped one', async () => {
    renderAllDecksSession()
    await settleQueries()

    const queue = createDemoQueue(entities, { now: demo.now })
    const decksInQueue = new Set(queue.map((card) => card.deckId))
    expect(decksInQueue.size).toBeGreaterThan(1)
    expect(screen.getByLabelText(`Card 1 of ${queue.length}`)).toBeTruthy()

    const first = queue[0]
    const logsBefore = entities.reviewLogs.length
    await answerAndRate()

    const graded = entities.cards.find((card) => card.id === first.id)
    expect(graded?.scheduling.reps).toBe(first.scheduling.reps + 1)
    expect(entities.reviewLogs).toHaveLength(logsBefore + 1)
    const repo = await getRepository().cards.getById(first.id)
    expect(repo?.scheduling).toEqual(graded?.scheduling)
  })
})
