// @vitest-environment happy-dom
//
// The regression suite for audit §10 item 5: a failed review write used to
// dispatch GRADED before persistence and drop the rejection on the floor, so the
// session sat in `transitioning` with the ratings disabled, no explanation, and
// no way forward. These drive the real ReviewSessionV2 against the real
// (fake-indexeddb-backed) repository, and force failures at the Dexie table so
// the rollback is genuine rather than simulated.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Card } from '@/types'
import { richText } from '@/types/card'
import { getRepository } from '@/data'
import { db } from '@/data/dexie/db'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { ReviewSessionV2 } from './ReviewSessionV2'

// What IndexedDB actually throws. None of this may ever reach the screen.
const RAW_BACKEND_ERROR =
  "Failed to execute 'add' on 'IDBObjectStore': DataError: Evaluating the object store's key path did not yield a value."

function recall(id: string, prompt: string): Card {
  return {
    id,
    schemaVersion: 2,
    deckId: 'deck-1',
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    suspended: false,
    scheduling: initialSchedulingState(0),
    prompt: richText(prompt),
    interaction: { type: 'recall', answer: richText(`Answer to ${prompt}`) },
  }
}

const CARD_A = recall('card-a', 'What is RAII?')
const CARD_B = recall('card-b', 'What is a vtable?')

function renderSession(cards: Card[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReviewSessionV2 cards={cards} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Reveal the answer and grade Good, by keyboard - the path a learner actually
// uses, and the one the `e.repeat` guard protects.
async function gradeGood(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard(' ')
  await user.keyboard('3')
}

async function logs() {
  return getRepository().reviews.all()
}

describe('Review persistence failure', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await repo.cards.clear()
    await repo.reviews.clear()
    await repo.cards.bulkPut([CARD_A, CARD_B])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('advances to the next card when the write commits', async () => {
    const user = userEvent.setup()
    renderSession([CARD_A, CARD_B])

    await gradeGood(user)

    expect(await screen.findByText('What is a vtable?')).toBeTruthy()
    expect(await logs()).toHaveLength(1)
  })

  it('does not advance, and explains itself, when the write rejects', async () => {
    vi.spyOn(db.reviewLogs, 'add').mockRejectedValue(new Error(RAW_BACKEND_ERROR))

    const user = userEvent.setup()
    renderSession([CARD_A, CARD_B])
    await gradeGood(user)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/couldn't save this review/i)
    expect(alert.textContent).toMatch(/nothing was changed/i)

    // Still on the first card, and nothing was persisted for it.
    expect(screen.getByText('What is RAII?')).toBeTruthy()
    expect(screen.queryByText('What is a vtable?')).toBeNull()
    expect(await logs()).toHaveLength(0)
    const stored = await getRepository().cards.getById('card-a')
    expect(stored?.scheduling.reps).toBe(0)
  })

  it('never renders raw backend error text', async () => {
    vi.spyOn(db.reviewLogs, 'add').mockRejectedValue(new Error(RAW_BACKEND_ERROR))

    const user = userEvent.setup()
    const { container } = renderSession([CARD_A, CARD_B])
    await gradeGood(user)
    await screen.findByRole('alert')

    expect(container.textContent).not.toMatch(/DataError|IDBObjectStore|key path/i)
  })

  it('offers a retry that does not make the learner answer or grade again', async () => {
    vi.spyOn(db.reviewLogs, 'add').mockRejectedValueOnce(new Error(RAW_BACKEND_ERROR))

    const user = userEvent.setup()
    renderSession([CARD_A, CARD_B])
    await gradeGood(user)

    const retry = await screen.findByRole('button', { name: /try again/i })
    // The answer is still revealed and no rating has to be re-picked.
    expect(screen.getByText('Answer to What is RAII?')).toBeTruthy()

    await user.click(retry)

    expect(await screen.findByText('What is a vtable?')).toBeTruthy()
    const all = await logs()
    expect(all).toHaveLength(1)
    expect(all[0].rating).toBe(3)
  })

  // The heart of Part D: a retry persists the result the grade already produced.
  // Re-submitting would recompute FSRS at a later `now` and mint a second log id.
  it('retries the identical computed result rather than grading again', async () => {
    vi.spyOn(db.reviewLogs, 'add').mockRejectedValueOnce(new Error(RAW_BACKEND_ERROR))

    const user = userEvent.setup()
    renderSession([CARD_A])
    await gradeGood(user)

    // The rejected attempt still carried a fully computed result, so capture
    // what the retry must reproduce from the commit the repository received.
    const commit = vi.spyOn(getRepository(), 'commitReview')
    await user.click(await screen.findByRole('button', { name: /try again/i }))

    await waitFor(async () => expect(await logs()).toHaveLength(1))
    expect(commit).toHaveBeenCalledTimes(1)

    const [{ card, log }] = commit.mock.calls[0]
    const stored = await getRepository().cards.getById('card-a')
    expect(stored).toEqual(card)
    expect((await logs())[0]).toEqual(log)
    // One grade, one scheduling advance - not two.
    expect(stored?.scheduling.reps).toBe(1)
  })

  it('cannot be double-submitted by repeated retry clicks', async () => {
    vi.spyOn(db.reviewLogs, 'add').mockRejectedValueOnce(new Error(RAW_BACKEND_ERROR))

    const user = userEvent.setup()
    renderSession([CARD_A])
    await gradeGood(user)

    const retry = await screen.findByRole('button', { name: /try again/i })
    const commit = vi.spyOn(getRepository(), 'commitReview')
    await Promise.all([user.click(retry), user.click(retry), user.click(retry)])

    await waitFor(async () => expect(await logs()).toHaveLength(1))
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('ignores further rating presses while a write is still in flight', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const real = getRepository().commitReview.bind(getRepository())
    const commit = vi
      .spyOn(getRepository(), 'commitReview')
      .mockImplementation(async (input) => {
        await gate
        await real(input)
      })

    const user = userEvent.setup()
    renderSession([CARD_A, CARD_B])
    await gradeGood(user)

    // A second and third grade while the first is unresolved.
    await user.keyboard('1')
    await user.keyboard('4')
    expect(commit).toHaveBeenCalledTimes(1)

    release()
    expect(await screen.findByText('What is a vtable?')).toBeTruthy()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(await logs()).toHaveLength(1)
  })
})

describe('Review completion Undo across the new persistence boundary', () => {
  beforeEach(async () => {
    const repo = getRepository()
    await repo.cards.clear()
    await repo.reviews.clear()
    await repo.cards.put(CARD_A)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('restores the card and removes exactly its log, then allows a fresh grade', async () => {
    const user = userEvent.setup()
    renderSession([CARD_A])
    await gradeGood(user)

    await user.click(await screen.findByRole('button', { name: /Undo last/ }))

    await waitFor(async () => expect(await logs()).toHaveLength(0))
    expect(await getRepository().cards.getById('card-a')).toEqual(CARD_A)

    // Re-grading after an undo produces one current log, not a second one.
    await gradeGood(user)
    await waitFor(async () => expect(await logs()).toHaveLength(1))
    const stored = await getRepository().cards.getById('card-a')
    expect(stored?.scheduling.reps).toBe(1)
  })

  it('keeps the graded state and says so when the undo itself fails', async () => {
    const user = userEvent.setup()
    renderSession([CARD_A])
    await gradeGood(user)

    const undoButton = await screen.findByRole('button', { name: /Undo last/ })
    vi.spyOn(db.reviewLogs, 'delete').mockRejectedValueOnce(new Error(RAW_BACKEND_ERROR))
    await user.click(undoButton)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/couldn't undo this review/i)
    expect(alert.textContent).toMatch(/still recorded/i)
    expect(alert.textContent).not.toMatch(/DataError|IDBObjectStore/i)

    // No partial reversal: the review is still fully recorded, so Undo is still
    // offered rather than silently popped off the stack.
    expect(await logs()).toHaveLength(1)
    const stored = await getRepository().cards.getById('card-a')
    expect(stored?.scheduling.reps).toBe(1)
    expect(screen.getByRole('button', { name: /Undo last/ })).toBeTruthy()
  })
})
