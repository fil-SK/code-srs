// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Card, OrderingInteraction } from '@/types/card'
import { richText } from '@/types/card'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { orderingDefinition } from './index'
import { ReviewSessionScreen } from '../../ReviewSessionScreen'

const interaction: OrderingInteraction = {
  type: 'ordering',
  randomize: false,
  items: [
    { id: 'item-a', content: richText('First') },
    { id: 'item-b', content: richText('Second') },
    { id: 'item-c', content: richText('Third') },
  ],
  // Deliberately not equal to the id-sorted display order (a, b, c), and only
  // item-a happens to land on its correct position, so grading exercises
  // partial credit, not just all-or-nothing.
  correctOrder: ['item-a', 'item-c', 'item-b'],
}

const fixture: Card & { interaction: OrderingInteraction } = {
  id: 'test-ordering-1',
  schemaVersion: 2,
  deckId: 'deck-1',
  prompt: richText('Order these steps.'),
  interaction,
  tags: [],
  createdAt: 0,
  updatedAt: 0,
}

function renderScreen() {
  return render(
    <ReviewSessionScreen
      card={fixture}
      definition={orderingDefinition}
      current={1}
      total={1}
      onExit={() => {}}
      schedulingBefore={initialSchedulingState()}
    />,
  )
}

function labels() {
  return screen.getAllByText(/^(First|Second|Third)$/).map((el) => el.textContent)
}

describe('OrderingView', () => {
  afterEach(() => cleanup())

  it('renders items in a deterministic (id-sorted) order when randomize is false', () => {
    renderScreen()
    expect(labels()).toEqual(['First', 'Second', 'Third'])
  })

  it('renders a decorative three-column by four-row dot grip on each draggable row', () => {
    renderScreen()

    const grips = document.querySelectorAll('[data-ordering-grip]')
    expect(grips).toHaveLength(3)
    for (const grip of grips) {
      expect(grip.getAttribute('aria-hidden')).toBe('true')
      expect(grip.querySelectorAll('[data-ordering-grip-dot]')).toHaveLength(12)
    }
  })

  it('exposes each unlocked row as a focusable keyboard drag target without arrow controls', () => {
    renderScreen()

    const firstRow = screen.getByRole('button', { name: 'First' })
    expect(firstRow.getAttribute('tabindex')).toBe('0')
    expect(screen.queryByRole('button', { name: /Move item/ })).toBeNull()
  })

  it('reorders a focused row with Space, Arrow, Space without submitting the card', async () => {
    const user = userEvent.setup()
    renderScreen()

    const thirdRow = screen.getByRole('button', { name: 'Third' })
    thirdRow.focus()
    await user.keyboard(' {ArrowUp} ')

    // happy-dom gives every sortable row a zero-sized rect, so the coordinate
    // getter moves to the first eligible slot rather than the adjacent slot.
    // Chromium verifies the real one-step geometry; this test pins the event
    // path and the important fact that Space does not submit the card.
    expect(labels()).toEqual(['Third', 'First', 'Second'])
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeTruthy()
    expect(screen.queryByText(/% in the right position/)).toBeNull()
  })

  it('an ordinary click on a row neither reorders nor submits it', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Second' }))

    expect(labels()).toEqual(['First', 'Second', 'Third'])
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeTruthy()
  })

  it('grades by submitted position and preserves the submitted order during feedback', async () => {
    const user = userEvent.setup()
    renderScreen()
    // Submit without reordering: First/Second/Third against correctOrder
    // [item-a, item-c, item-b] - only "First" (item-a) is in the right spot.
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('33% in the right position')).toBeTruthy()
    expect(labels()).toEqual(['First', 'Second', 'Third'])
  })

  it('does not submit or flip when the card surface is clicked', async () => {
    const user = userEvent.setup()
    renderScreen()

    const front = document.querySelector<HTMLElement>('.itera-flip-front')
    expect(front).toBeTruthy()
    expect(front?.getAttribute('role')).toBeNull()

    await user.click(front!)

    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeTruthy()
    expect(screen.queryByText('33% in the right position')).toBeNull()
  })

  it('announces a keyboard-moved item and its new position via an aria-live region', async () => {
    const user = userEvent.setup()
    renderScreen()

    const thirdRow = screen.getByRole('button', { name: 'Third' })
    thirdRow.focus()
    await user.keyboard(' {ArrowUp} ')

    expect(await screen.findByText('Third moved to position 1 of 3')).toBeTruthy()
  })
})
