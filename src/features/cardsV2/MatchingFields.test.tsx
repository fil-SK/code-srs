// @vitest-environment happy-dom
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { emptyMatchingForm, type MatchingFormState } from '@/domain/cardsV2/matchingForm'
import { MatchingFields } from './MatchingFields'

function Harness({
  initial,
  onState,
}: {
  initial: MatchingFormState
  onState?: (form: MatchingFormState) => void
}) {
  const [form, setForm] = useState(initial)
  return (
    <MatchingFields
      form={form}
      onChange={(next) => {
        setForm(next)
        onState?.(next)
      }}
    />
  )
}

function threeRowForm(): MatchingFormState {
  const form = emptyMatchingForm('deck-1')
  const columnId = form.columns[0].id
  return {
    ...form,
    prompt: 'Q',
    sourceLabel: 'Term',
    columns: [{ ...form.columns[0], label: 'Definition' }],
    rows: [
      { id: 'row-a', source: 'First', cells: { [columnId]: 'A1' } },
      { id: 'row-b', source: 'Second', cells: { [columnId]: 'B1' } },
      { id: 'row-c', source: 'Third', cells: { [columnId]: 'C1' } },
    ],
  }
}

describe('MatchingFields', () => {
  afterEach(() => cleanup())

  it('adds and removes rows, disabling remove at the 2-row floor', async () => {
    const user = userEvent.setup()
    render(<Harness initial={emptyMatchingForm('deck-1')} />)

    expect(screen.getAllByPlaceholderText('Term')).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Remove row 1' }))
    expect(screen.getAllByPlaceholderText('Term')).toHaveLength(2)
    const removeButtons = screen.getAllByLabelText(/Remove row/)
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: /Add row/ }))
    expect(screen.getAllByPlaceholderText('Term')).toHaveLength(3)
    expect((screen.getAllByLabelText(/Remove row/)[0] as HTMLButtonElement).disabled).toBe(false)
  })

  it('move up/down reorders rows, preserving each row\'s id/source/cells, and keeps focus', async () => {
    const user = userEvent.setup()
    let latest: MatchingFormState | undefined
    render(<Harness initial={threeRowForm()} onState={(f) => (latest = f)} />)

    const moveDown = screen.getByRole('button', { name: 'Move row 1 down' })
    moveDown.focus()
    await user.keyboard('{Enter}')

    expect(latest?.rows.map((r) => [r.id, r.source])).toEqual([
      ['row-b', 'Second'],
      ['row-a', 'First'],
      ['row-c', 'Third'],
    ])
    expect(document.activeElement).toBe(moveDown)
  })

  it('the up control at the top of the list is a clean no-op', async () => {
    const user = userEvent.setup()
    let latest: MatchingFormState | undefined
    render(<Harness initial={threeRowForm()} onState={(f) => (latest = f)} />)

    await user.click(screen.getByRole('button', { name: 'Move row 1 up' }))
    expect(latest?.rows.map((r) => r.id)).toEqual(['row-a', 'row-b', 'row-c'])
  })

  it('adds and removes columns, disabling remove at the 1-column floor, cascading cell cleanup', async () => {
    const user = userEvent.setup()
    let latest: MatchingFormState | undefined
    render(<Harness initial={threeRowForm()} onState={(f) => (latest = f)} />)

    expect((screen.getByLabelText('Remove column') as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: /Add column/ }))
    expect(screen.getAllByLabelText('Remove column')).toHaveLength(2)
    expect((screen.getAllByLabelText('Remove column')[0] as HTMLButtonElement).disabled).toBe(
      false,
    )

    const newColumnId = latest!.columns[1].id
    await user.click(screen.getAllByLabelText('Remove column')[1])
    expect(latest?.columns).toHaveLength(1)
    // Cascade: the removed column's key is gone from every row's cells.
    expect(latest?.rows.every((r) => !(newColumnId in r.cells))).toBe(true)
  })

  it('replaces Add column with the cap notice once the card holds 3 columns', async () => {
    const user = userEvent.setup()
    render(<Harness initial={threeRowForm()} />)

    await user.click(screen.getByRole('button', { name: /Add column/ }))

    expect(screen.queryByRole('button', { name: /Add column/ })).toBeNull()
    expect(screen.getByText('A Matching card holds at most 3 columns.')).toBeTruthy()

    await user.click(screen.getAllByLabelText('Remove column')[1])
    expect(screen.getByRole('button', { name: /Add column/ })).toBeTruthy()
  })

  it('toggling a column fixed seeds 2 options; add/rename/remove options down to the 2-option floor', async () => {
    const user = userEvent.setup()
    let latest: MatchingFormState | undefined
    render(<Harness initial={threeRowForm()} onState={(f) => (latest = f)} />)

    const toggle = screen.getByRole('checkbox', {
      name: 'One shared list of values (several terms can connect to the same value)',
    })
    await user.click(toggle)
    expect(latest?.columns[0].fixed).toBe(true)
    expect(latest?.columns[0].options).toHaveLength(2)
    // Toggling fixed resets every row's cell for that column.
    expect(latest?.rows.every((r) => r.cells[latest!.columns[0].id] === '')).toBe(true)

    await user.click(screen.getByRole('button', { name: /Add option/ }))
    expect(latest?.columns[0].options).toHaveLength(3)

    const optionInputs = screen.getAllByPlaceholderText('Option value (e.g. Yes)')
    await user.type(optionInputs[2], 'Maybe')
    expect(latest?.columns[0].options[2].text).toBe('Maybe')

    await user.click(screen.getAllByLabelText('Remove option')[2])
    expect(latest?.columns[0].options).toHaveLength(2)
    expect(
      (screen.getAllByLabelText('Remove option')[0] as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('removing a fixed option resets any row that had it selected', async () => {
    const user = userEvent.setup()
    let latest: MatchingFormState | undefined
    render(<Harness initial={threeRowForm()} onState={(f) => (latest = f)} />)

    await user.click(
      screen.getByRole('checkbox', { name: 'One shared list of values (several terms can connect to the same value)' }),
    )
    const columnId = latest!.columns[0].id
    const yesOptionId = latest!.columns[0].options[0].id

    const rowSelects = screen.getAllByRole('combobox')
    await user.selectOptions(rowSelects[0], yesOptionId)
    expect(latest?.rows[0].cells[columnId]).toBe(yesOptionId)

    // Add a 3rd option first so removal isn't blocked by the 2-option floor.
    await user.click(screen.getByRole('button', { name: /Add option/ }))
    await user.click(screen.getAllByLabelText('Remove option')[0])
    expect(latest?.rows[0].cells[columnId]).toBe('')
  })

  it('shows inline validation errors and clears them once the form becomes valid', async () => {
    const user = userEvent.setup()
    const invalid: MatchingFormState = {
      ...emptyMatchingForm('deck-1'),
      prompt: '',
      sourceLabel: 'Term',
      rows: [
        { id: 'a', source: '', cells: {} },
        { id: 'b', source: '', cells: {} },
      ],
    }
    render(<Harness initial={invalid} />)

    expect(screen.getByText('Prompt is required.')).toBeTruthy()
    expect(screen.getByText('All rows need Term text.')).toBeTruthy()

    await user.type(screen.getByPlaceholderText('Match each term to its definition.'), 'Q')
    const sourceInputs = screen.getAllByPlaceholderText('Term')
    await user.type(sourceInputs[0], 'A')
    await user.type(sourceInputs[1], 'B')
    const cellInputs = screen.getAllByPlaceholderText('Match')
    await user.type(cellInputs[0], 'X')
    await user.type(cellInputs[1], 'Y')

    expect(screen.queryByText('Prompt is required.')).toBeNull()
    expect(screen.queryByText('All rows need Term text.')).toBeNull()
  })
})
