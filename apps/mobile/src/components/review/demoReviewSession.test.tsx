import type { Rating } from '@itera/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native'

import { DemoReviewSession } from '@/src/components/review/DemoReviewSession'
import { createDemoQueue } from '@/src/demo/demoQueue'
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
    expect(demo.workspace.reviewLogs).toHaveLength(0)

    await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(1)

    await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(2)
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
    expect(demo.workspace.reviewLogs[0].dueAfter).toBe(after.due)
    expect(demo.workspace.reviewLogs[0].stabilityAfter).toBe(after.stability)
  })

  it('stops the graded card being due', async () => {
    renderSession()
    await settle()

    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]
    await answerAndRate(4)

    const remaining = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })
    expect(remaining.some((entry) => entry.id === first.id)).toBe(false)
  })

  it('records the pre-grade state on the log, not the post-grade one', async () => {
    renderSession()
    await settle()
    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]
    const stateBefore = first.scheduling.state

    await answerAndRate()

    expect(demo.workspace.reviewLogs[0].stateBefore).toBe(stateBefore)
    expect(demo.workspace.reviewLogs[0].cardId).toBe(first.id)
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

    for (let i = 0; i < queue.length; i++) await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(queue.length)

    fireEvent.press(screen.getByLabelText('Undo last card'))
    await settle()

    expect(demo.workspace.reviewLogs).toHaveLength(queue.length - 1)
    expect(demo.workspace.cards.find((entry) => entry.id === last.id)!.scheduling).toEqual(
      lastBefore,
    )
    // The other cards keep their new schedules; undo is one level, not a reset.
    expect(demo.workspace.reviewLogs.some((log) => log.cardId === last.id)).toBe(false)
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

    fireEvent.press(screen.getByLabelText('Exit review session'))

    expect(exits.count).toBe(1)
    expect(demo.workspace.reviewLogs).toHaveLength(0)
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
    // Nothing is repopulated to keep the demo interesting.
    expect(demo.workspace.reviewLogs).toHaveLength(0)
  })

  it('restores the original workspace on a demo reset', async () => {
    renderSession()
    await settle()
    const first = createDemoQueue(demo.workspace, { now: demo.now, deckId: DECK })[0]
    const originalScheduling = first.scheduling

    await answerAndRate()
    expect(demo.workspace.reviewLogs).toHaveLength(1)

    await settle()
    demo.resetDemoWorkspace()
    await settle()

    expect(demo.workspace.reviewLogs).toHaveLength(0)
    const restored = demo.workspace.cards.find((entry) => entry.id === first.id)!.scheduling
    expect(restored.reps).toBe(originalScheduling.reps)
    expect(restored.state).toBe(originalScheduling.state)
  })
})
