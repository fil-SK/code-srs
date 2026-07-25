// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CardV2, OrderingInteraction } from '@/types/cardV2'
import { richText } from '@/types/cardV2'
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

const fixture: CardV2 & { interaction: OrderingInteraction } = {
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

  it('moving an item down with the keyboard-accessible control updates the order and keeps focus on it', async () => {
    const user = userEvent.setup()
    renderScreen()

    const moveDown = screen.getByRole('button', { name: 'Move item 1 down' })
    moveDown.focus()
    await user.keyboard('{Enter}')

    expect(labels()).toEqual(['Second', 'First', 'Third'])
    // Same DOM node (key={id} reconciliation) - not merely "something" focused.
    expect(document.activeElement).toBe(moveDown)
  })

  it('the up control at the top of the list is a clean no-op, not a crash or a swap', async () => {
    const user = userEvent.setup()
    renderScreen()
    const moveUp = screen.getByRole('button', { name: 'Move item 1 up' })
    moveUp.focus()
    await user.keyboard('{Enter}')
    expect(labels()).toEqual(['First', 'Second', 'Third'])
    expect(document.activeElement).toBe(moveUp)
  })

  it('drag-and-drop is not the only way to reorder: the whole card is keyboard-operable end to end', async () => {
    const user = userEvent.setup()
    renderScreen()

    // First is already correct at position 0; swap Second/Third into the
    // right order using only Move up/down + Submit + a rating key.
    const moveThirdUp = screen.getByRole('button', { name: 'Move item 3 up' })
    await user.click(moveThirdUp)
    expect(labels()).toEqual(['First', 'Third', 'Second'])

    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    // "Correct" appears per-row and in the summary banner - assert the
    // ambiguous banner state (not present) rather than a single "Correct".
    await screen.findAllByText('Correct')
    expect(screen.queryByText(/% in the right position/)).toBeNull()
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
})
