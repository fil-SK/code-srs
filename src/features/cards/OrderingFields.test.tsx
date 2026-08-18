// @vitest-environment happy-dom
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { emptyOrderingForm, type OrderingFormState } from '@/domain/cards/orderingForm'
import { OrderingFields } from './OrderingFields'

function Harness({
  initial,
  onState,
}: {
  initial: OrderingFormState
  onState?: (form: OrderingFormState) => void
}) {
  const [form, setForm] = useState(initial)
  return (
    <OrderingFields
      form={form}
      onChange={(next) => {
        setForm(next)
        onState?.(next)
      }}
    />
  )
}

function threeItemForm(): OrderingFormState {
  return {
    ...emptyOrderingForm('deck-1'),
    prompt: 'Q',
    items: [
      { id: 'item-a', text: 'First' },
      { id: 'item-b', text: 'Second' },
      { id: 'item-c', text: 'Third' },
    ],
  }
}

describe('OrderingFields', () => {
  afterEach(() => cleanup())

  it('adds and removes items, disabling remove at the 2-item floor', async () => {
    const user = userEvent.setup()
    render(<Harness initial={emptyOrderingForm('deck-1')} />)

    expect(screen.getAllByPlaceholderText('Step or item text…')).toHaveLength(3)

    // Drop to 2 items first to reach the floor.
    await user.click(screen.getAllByLabelText(/Remove item/)[0])
    expect(screen.getAllByPlaceholderText('Step or item text…')).toHaveLength(2)
    const removeButtons = screen.getAllByLabelText(/Remove item/)
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: /Add item/ }))
    expect(screen.getAllByPlaceholderText('Step or item text…')).toHaveLength(3)
    expect((screen.getAllByLabelText(/Remove item/)[0] as HTMLButtonElement).disabled).toBe(false)
  })

  it('move up/down reorders items while preserving each item\'s id/text, and keeps focus on the moved button', async () => {
    const user = userEvent.setup()
    render(<Harness initial={threeItemForm()} />)

    const moveDown = screen.getByRole('button', { name: 'Move item 1 down' })
    moveDown.focus()
    await user.keyboard('{Enter}')

    const texts = screen
      .getAllByPlaceholderText('Step or item text…')
      .map((el) => (el as HTMLTextAreaElement).value)
    expect(texts).toEqual(['Second', 'First', 'Third'])
    expect(document.activeElement).toBe(moveDown)
  })

  it('the up control at the top of the list is a clean no-op', async () => {
    const user = userEvent.setup()
    render(<Harness initial={threeItemForm()} />)

    const moveUp = screen.getByRole('button', { name: 'Move item 1 up' })
    moveUp.focus()
    await user.keyboard('{Enter}')

    const texts = screen
      .getAllByPlaceholderText('Step or item text…')
      .map((el) => (el as HTMLTextAreaElement).value)
    expect(texts).toEqual(['First', 'Second', 'Third'])
  })

  it('preserves stable ids through reorder and removal', async () => {
    const user = userEvent.setup()
    let latest: OrderingFormState | undefined
    render(<Harness initial={threeItemForm()} onState={(f) => (latest = f)} />)

    await user.click(screen.getByRole('button', { name: 'Move item 1 down' }))
    expect(latest?.items.map((i) => i.id)).toEqual(['item-b', 'item-a', 'item-c'])

    await user.click(screen.getByRole('button', { name: 'Remove item 3' }))
    expect(latest?.items.map((i) => i.id)).toEqual(['item-b', 'item-a'])
  })

  it('toggles the randomize checkbox', async () => {
    const user = userEvent.setup()
    let latest: OrderingFormState | undefined
    render(<Harness initial={threeItemForm()} onState={(f) => (latest = f)} />)

    const toggle = screen.getByRole('checkbox', { name: 'Randomize order in Review' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    await user.click(toggle)
    expect(latest?.randomize).toBe(true)
  })

  it('shows inline validation errors and clears them once the form becomes valid', async () => {
    const user = userEvent.setup()
    const invalid: OrderingFormState = {
      ...emptyOrderingForm('deck-1'),
      prompt: '',
      items: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
      ],
    }
    render(<Harness initial={invalid} />)

    expect(screen.getByText('Prompt is required.')).toBeTruthy()
    expect(screen.getByText('All items need text.')).toBeTruthy()

    await user.type(screen.getByPlaceholderText('Put these steps in the correct order.'), 'Q')
    const itemInputs = screen.getAllByPlaceholderText('Step or item text…')
    await user.type(itemInputs[0], 'A')
    await user.type(itemInputs[1], 'B')

    expect(screen.queryByText('Prompt is required.')).toBeNull()
    expect(screen.queryByText('All items need text.')).toBeNull()
  })
})
