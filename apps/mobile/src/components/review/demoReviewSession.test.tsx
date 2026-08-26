import type { Rating } from '@itera/core'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'

import { DemoReviewSession } from '@/src/components/review/DemoReviewSession'
import { createDemoQueue } from '@/src/demo/demoQueue'
import { createDemoWorkspace } from '@/src/demo/demoWorkspace'
import {
  demoDeckViewModel,
  demoLibraryViewModel,
  demoProgressViewModel,
  demoTodayViewModel,
} from '@/src/demo/demoSelectors'
import { DemoWorkspaceProvider } from '@/src/demo/DemoWorkspaceProvider'
import { useDemoWorkspace, type DemoWorkspaceValue } from '@/src/demo/demoWorkspaceContext'
import { settle, mockReducedMotion } from '@/src/test/reviewHarness'

// The session over the real demo workspace: queue, progress, completion, undo,
// and what all of that leaves behind in memory.
//
// Scoped to one deck so a whole session is a handful of cards. The per-type
// behavior is covered by the six interaction files; what is asserted here is
// the wiring between the queue, the shared scheduler and the demo state.

mockReducedMotion()
afterEach(cleanup)

const DECK = 'fixture-modern-cpp'

let demo: DemoWorkspaceValue

function Probe() {
  demo = useDemoWorkspace()
  return null
}

function renderSession() {
  const exits = { count: 0 }
  const view = render(
    <DemoWorkspaceProvider>
      <Probe />
      <DemoReviewSession
        deckId={DECK}
        onExit={() => {
          exits.count += 1
        }}
      />
    </DemoWorkspaceProvider>,
  )
  return { ...view, exits }
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
  await settle()

  const labels: Record<Rating, RegExp> = {
    1: /^Again,/,
    2: /^Hard,/,
    3: /^Good,/,
    4: /^Easy,/,
  }
  fireEvent.press(screen.getByLabelText(labels[rating]))
  await settle()
}

describe('a demo review session', () => {
  it('opens on the first card of a deterministic queue', async () => {
    renderSession()
    await settle()

    const queue = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })
    expect(queue.length).toBeGreaterThan(1)
    expect(screen.getByLabelText(`Card 1 of ${queue.length}`)).toBeTruthy()
  })

  it('queues only cards the deck scope covers', async () => {
    renderSession()
    await settle()

    const queue = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })
    const outside = demo.workspace.cards.filter((card) => card.deckId !== DECK)

    expect(queue.length).toBeGreaterThan(0)
    expect(outside.length).toBeGreaterThan(0)
    for (const card of queue) expect(card.deckId).toBe(DECK)
    for (const card of outside) expect(queue.some((entry) => entry.id === card.id)).toBe(false)
  })

  it('advances to the next card after a rating', async () => {
    renderSession()
    await settle()
    const total = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK }).length

    await answerAndRate()

    expect(screen.getByLabelText(`Card 2 of ${total}`)).toBeTruthy()
  })

  it('appends exactly one ReviewLog per graded card', async () => {
    renderSession()
    await settle()
    const seeded = demo.workspace.reviewLogs.length

    await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(seeded + 1)

    await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(seeded + 2)
  })

  it('writes the shared scheduler s result onto the demo card', async () => {
    renderSession()
    await settle()

    const queue = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })
    const first = queue[0]
    const before = first.scheduling

    await answerAndRate()

    const after = demo.workspace.cards.find((entry) => entry.id === first.id)!.scheduling
    expect(after.reps).toBe(before.reps + 1)
    expect(after.due).toBeGreaterThan(before.due)
    // The log and the card agree, because both come from the one computed
    // result rather than being derived twice.
    expect(demo.workspace.reviewLogs.at(-1)?.dueAfter).toBe(after.due)
    expect(demo.workspace.reviewLogs.at(-1)?.stabilityAfter).toBe(after.stability)
  })

  it('stops the graded card being due', async () => {
    renderSession()
    await settle()

    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]
    await answerAndRate(4)

    const remaining = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })
    expect(remaining.some((entry) => entry.id === first.id)).toBe(false)
  })

  it('reacts across Today, Progress, and Library after a grade', async () => {
    renderSession()
    await settle()
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const beforeToday = demoTodayViewModel(demo.workspace, greeting, demo.now)
    const beforeProgress = demoProgressViewModel(demo.workspace, demo.now)
    const beforeLibrary = demoLibraryViewModel(demo.workspace, demo.now)

    await answerAndRate(4)

    const afterToday = demoTodayViewModel(demo.workspace, greeting, demo.now)
    const afterProgress = demoProgressViewModel(demo.workspace, demo.now)
    const afterLibrary = demoLibraryViewModel(demo.workspace, demo.now)
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
    expect(
      afterLibrary.decks.find((deck) => deck.id === DECK)?.dueCount,
    ).toBe((beforeLibrary.decks.find((deck) => deck.id === DECK)?.dueCount ?? 0) - 1)
  })

  it('ignores a duplicate Undo instead of restoring over newer state', async () => {
    renderSession()
    await settle()
    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]
    const before = first.scheduling

    await answerAndRate(4)
    const logId = demo.workspace.reviewLogs.at(-1)!.id
    act(() => demo.undoDemoReview(first.id, before, logId))
    await settle()
    const once = demo.workspace

    act(() => demo.undoDemoReview(first.id, before, logId))
    await settle()
    expect(demo.workspace).toBe(once)
  })

  it('records the pre-grade state on the log, not the post-grade one', async () => {
    renderSession()
    await settle()
    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]
    const stateBefore = first.scheduling.state

    await answerAndRate()

    expect(demo.workspace.reviewLogs.at(-1)?.stateBefore).toBe(stateBefore)
    expect(demo.workspace.reviewLogs.at(-1)?.cardId).toBe(first.id)
  })

  it('moves the originating deck s own metrics, and Undo moves them back', async () => {
    renderSession()
    await settle()
    const deckBefore = demoDeckViewModel(demo.workspace, DECK, demo.now)!
    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]

    await answerAndRate(4)

    const deckAfter = demoDeckViewModel(demo.workspace, DECK, demo.now)!
    expect(deckAfter.dueCount).toBe(deckBefore.dueCount - 1)
    expect(deckAfter.cardCount).toBe(deckBefore.cardCount)

    const logId = demo.workspace.reviewLogs.at(-1)!.id
    act(() => demo.undoDemoReview(first.id, first.scheduling, logId))
    await settle()

    // The deck screen recomputes from the workspace, so there is nothing to
    // reverse on it - reversing the data is the whole of the fix.
    expect(demoDeckViewModel(demo.workspace, DECK, demo.now)).toEqual(deckBefore)
  })

  it('reaches a completion screen once the queue is exhausted', async () => {
    renderSession()
    await settle()
    const total = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK }).length

    for (let i = 0; i < total; i++) await answerAndRate()

    expect(screen.getByText('Session complete')).toBeTruthy()
    expect(screen.getByText(`You reviewed ${total} of ${total} cards.`)).toBeTruthy()
  })

  it('exits from the completion screen', async () => {
    const { exits } = renderSession()
    await settle()
    const total = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK }).length

    for (let i = 0; i < total; i++) await answerAndRate()
    fireEvent.press(screen.getByText('Done'))

    expect(exits.count).toBe(1)
  })

  it('undoes exactly the last card, restoring its recorded state', async () => {
    renderSession()
    await settle()
    const queue = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })
    const last = queue[queue.length - 1]
    const lastBefore = last.scheduling
    const seeded = demo.workspace.reviewLogs.length

    for (let i = 0; i < queue.length - 1; i++) await answerAndRate()
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const metricsBeforeLast = demoProgressViewModel(demo.workspace, demo.now)
    const todayBeforeLast = demoTodayViewModel(demo.workspace, greeting, demo.now)
    await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(seeded + queue.length)

    fireEvent.press(screen.getByLabelText('Undo last card'))
    await settle()

    expect(demo.workspace.reviewLogs).toHaveLength(seeded + queue.length - 1)
    expect(demo.workspace.cards.find((entry) => entry.id === last.id)!.scheduling).toEqual(
      lastBefore,
    )
    expect(demoProgressViewModel(demo.workspace, demo.now)).toEqual(metricsBeforeLast)
    expect(demoTodayViewModel(demo.workspace, greeting, demo.now)).toEqual(todayBeforeLast)
    // The other cards keep their new schedules; undo is one level, not a reset.
    expect(demo.workspace.reviewLogs.filter((log) => log.cardId === last.id)).toHaveLength(
      demo.workspace.reviewLogs.slice(0, seeded).filter((log) => log.cardId === last.id).length,
    )
  })

  it('offers no Undo before anything has been graded', async () => {
    renderSession()
    await settle()

    fireEvent.press(screen.getByLabelText('Exit review session'))
    expect(screen.queryByLabelText('Undo last card')).toBeNull()
  })

  it('exits mid-session without recording anything', async () => {
    const { exits } = renderSession()
    await settle()
    const seeded = demo.workspace.reviewLogs.length

    fireEvent.press(screen.getByLabelText('Exit review session'))

    expect(exits.count).toBe(1)
    expect(demo.workspace.reviewLogs).toHaveLength(seeded)
  })

  it('shows an honest caught-up state when the deck has nothing due', async () => {
    render(
      <DemoWorkspaceProvider>
        <Probe />
        <DemoReviewSession deckId="fixture-computer-networks" onExit={() => {}} />
      </DemoWorkspaceProvider>,
    )
    await settle()

    expect(screen.getByText('All caught up')).toBeTruthy()
    // Nothing is repopulated to keep the demo interesting: the seeded history
    // is still exactly the seeded history. Compared against a fresh workspace
    // rather than a literal, so the fixture can grow without editing this.
    expect(demo.workspace.reviewLogs).toEqual(
      createDemoWorkspace(demo.workspace.startedAt).reviewLogs,
    )
  })

  it('restores the original workspace on a demo reset', async () => {
    renderSession()
    await settle()
    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]
    const originalScheduling = first.scheduling
    const originalLogs = demo.workspace.reviewLogs
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const originalToday = demoTodayViewModel(demo.workspace, greeting, demo.now)
    const originalProgress = demoProgressViewModel(demo.workspace, demo.now)

    await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(originalLogs.length + 1)

    await settle()
    act(() => demo.resetDemoWorkspace())
    await settle()

    expect(demo.workspace.reviewLogs).toEqual(originalLogs)
    const restored = demo.workspace.cards.find((entry) => entry.id === first.id)!.scheduling
    expect(restored.reps).toBe(originalScheduling.reps)
    expect(restored.state).toBe(originalScheduling.state)
    expect(demoTodayViewModel(demo.workspace, greeting, demo.now)).toEqual(originalToday)
    expect(demoProgressViewModel(demo.workspace, demo.now)).toEqual(originalProgress)
  })

  // The reset is what makes repeated recordings possible: a demo is run, cards
  // are graded, notifications are opened, and the next take has to start from
  // the same frame as the first. This drives a whole session to completion and
  // marks the inbox read before resetting, then compares the entire workspace
  // against a fresh one rather than spot-checking the fields that were touched.
  it('can move one notification in both directions without screen-local state', async () => {
    renderSession()
    await settle()
    const notification = demo.workspace.notifications.find((item) => !item.unread)!

    act(() => demo.markNotificationUnread(notification.id))
    await settle()
    expect(demo.workspace.notifications.find((item) => item.id === notification.id)?.unread).toBe(
      true,
    )

    act(() => demo.markNotificationRead(notification.id))
    await settle()
    expect(demo.workspace.notifications.find((item) => item.id === notification.id)?.unread).toBe(
      false,
    )
  })

  it('restores the exact starting state after a full session and a read inbox', async () => {
    renderSession()
    await settle()
    const greeting = { mainText: 'Ready?', subtext: 'Keep going.' }
    const pristine = createDemoWorkspace(demo.workspace.startedAt)

    const queueLength = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK }).length
    expect(queueLength).toBeGreaterThan(1)
    for (let index = 0; index < queueLength; index += 1) await answerAndRate()
    await settle()

    expect(screen.getByText('Session complete')).toBeTruthy()
    act(() => demo.markAllNotificationsRead())
    await settle()

    // Everything moved: scheduling, history, the inbox and every derived screen.
    expect(demo.workspace.reviewLogs.length).toBe(pristine.reviewLogs.length + queueLength)
    expect(demo.workspace.notifications.every((item) => !item.unread)).toBe(true)
    expect(demo.workspace.cards).not.toEqual(pristine.cards)

    act(() => demo.resetDemoWorkspace())
    await settle()

    expect(demo.workspace).toEqual(pristine)
    expect(demoTodayViewModel(demo.workspace, greeting, demo.now)).toEqual(
      demoTodayViewModel(pristine, greeting, demo.now),
    )
    expect(demoProgressViewModel(demo.workspace, demo.now)).toEqual(
      demoProgressViewModel(pristine, demo.now),
    )
    expect(demoLibraryViewModel(demo.workspace, demo.now)).toEqual(
      demoLibraryViewModel(pristine, demo.now),
    )
    expect(demoDeckViewModel(demo.workspace, DECK, demo.now)).toEqual(
      demoDeckViewModel(pristine, DECK, demo.now),
    )
  })
})
