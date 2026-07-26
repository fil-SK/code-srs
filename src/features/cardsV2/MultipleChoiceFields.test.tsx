// @vitest-environment happy-dom
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { emptyMultipleChoiceForm, type MultipleChoiceFormState } from '@/domain/cardsV2/multipleChoiceForm'
import { MultipleChoiceFields } from './MultipleChoiceFields'

function Harness({
  initial,
  onState,
}: {
  initial: MultipleChoiceFormState
  onState?: (form: MultipleChoiceFormState) => void
}) {
  const [form, setForm] = useState(initial)
  return (
    <MultipleChoiceFields
      form={form}
      onChange={(next) => {
        setForm(next)
        onState?.(next)
      }}
    />
  )
}

function threeOptionForm(): MultipleChoiceFormState {
  return {
    ...emptyMultipleChoiceForm('deck-1'),
    prompt: 'Q',
    options: [
      { id: 'opt-a', text: 'First', correct: true },
      { id: 'opt-b', text: 'Second', correct: false },
      { id: 'opt-c', text: 'Third', correct: false },
    ],
  }
}

describe('MultipleChoiceFields', () => {
  afterEach(() => cleanup())

  it('adds and removes options, disabling remove at the 2-option floor', async () => {
    const user = userEvent.setup()
    render(<Harness initial={emptyMultipleChoiceForm('deck-1')} />)

    expect(screen.getAllByPlaceholderText('Option text')).toHaveLength(2)
    const removeButtons = screen.getAllByLabelText(/Remove option/)
    expect((removeButtons[0] as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: /Add option/ }))
    expect(screen.getAllByPlaceholderText('Option text')).toHaveLength(3)
    expect((screen.getAllByLabelText(/Remove option/)[0] as HTMLButtonElement).disabled).toBe(false)

    await user.click(screen.getAllByLabelText(/Remove option/)[0])
    expect(screen.getAllByPlaceholderText('Option text')).toHaveLength(2)
  })

  it('single-select: marking a new option correct clears the previous one', async () => {
    const user = userEvent.setup()
    render(<Harness initial={threeOptionForm()} />)

    const markCorrect = screen.getAllByRole('radio', { name: /Mark option/ })
    expect(markCorrect[0].getAttribute('aria-checked')).toBe('true')

    await user.click(markCorrect[1])
    expect(markCorrect[0].getAttribute('aria-checked')).toBe('false')
    expect(markCorrect[1].getAttribute('aria-checked')).toBe('true')
  })

  it('multiple-select: correctness toggles independently per option', async () => {
    const user = userEvent.setup()
    render(<Harness initial={{ ...threeOptionForm(), selectionMode: 'multiple' }} />)

    const markCorrect = screen.getAllByRole('checkbox', { name: /Mark option/ })
    await user.click(markCorrect[1])
    expect(markCorrect[0].getAttribute('aria-checked')).toBe('true')
    expect(markCorrect[1].getAttribute('aria-checked')).toBe('true')

    await user.click(markCorrect[0])
    expect(markCorrect[0].getAttribute('aria-checked')).toBe('false')
    expect(markCorrect[1].getAttribute('aria-checked')).toBe('true')
  })

  it('switching multiple -> single auto-trims to the first correct option', async () => {
    const user = userEvent.setup()
    let latest: MultipleChoiceFormState | undefined
    render(
      <Harness
        initial={{
          ...threeOptionForm(),
          selectionMode: 'multiple',
          options: [
            { id: 'opt-a', text: 'First', correct: true },
            { id: 'opt-b', text: 'Second', correct: true },
            { id: 'opt-c', text: 'Third', correct: false },
          ],
        }}
        onState={(f) => {
          latest = f
        }}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Allow multiple correct answers' }))

    expect(latest?.selectionMode).toBe('single')
    expect(latest?.options.map((o) => o.correct)).toEqual([true, false, false])
  })

  it('move up/down reorders options while preserving each option\'s id/text/correct, and keeps focus on the moved button', async () => {
    const user = userEvent.setup()
    render(<Harness initial={threeOptionForm()} />)

    const moveDown = screen.getByRole('button', { name: 'Move option 1 down' })
    moveDown.focus()
    await user.keyboard('{Enter}')

    const texts = screen.getAllByPlaceholderText('Option text').map((el) => (el as HTMLInputElement).value)
    expect(texts).toEqual(['Second', 'First', 'Third'])
    // "First" (originally correct) should still be marked correct after moving.
    const markCorrect = screen.getAllByRole('radio', { name: /Mark option/ })
    expect(markCorrect[1].getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(moveDown)
  })

  it('shows inline validation errors and clears them once the form becomes valid', async () => {
    const user = userEvent.setup()
    const invalid: MultipleChoiceFormState = {
      ...emptyMultipleChoiceForm('deck-1'),
      prompt: '',
      options: [
        { id: 'a', text: '', correct: false },
        { id: 'b', text: '', correct: false },
      ],
    }
    render(<Harness initial={invalid} />)

    expect(screen.getByText('Prompt is required.')).toBeTruthy()
    expect(screen.getByText('All options need text.')).toBeTruthy()
    expect(screen.getByText('Mark at least one option as correct.')).toBeTruthy()

    await user.type(screen.getByPlaceholderText(/Which of these/), 'Q')
    const optionInputs = screen.getAllByPlaceholderText('Option text')
    await user.type(optionInputs[0], 'A')
    await user.type(optionInputs[1], 'B')
    await user.click(screen.getAllByRole('radio', { name: /Mark option/ })[0])

    expect(screen.queryByText('Prompt is required.')).toBeNull()
    expect(screen.queryByText('All options need text.')).toBeNull()
    expect(screen.queryByText('Mark at least one option as correct.')).toBeNull()
  })
})
