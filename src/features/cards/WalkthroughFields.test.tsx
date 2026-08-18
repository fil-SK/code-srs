// @vitest-environment happy-dom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { emptyWalkthroughForm, type WalkthroughFormState } from '@/domain/cards/walkthroughForm'
import { WalkthroughFields } from './WalkthroughFields'

// Real CodeMirror 6 (LazyCodeEditor) has no existing precedent mounted under
// happy-dom in this repo (see WriteCodeEditorShell.test.tsx's identical
// comment) — replaced with a minimal textarea stub so this file can exercise
// WalkthroughFields' own state/wiring without depending on CodeMirror's DOM
// measurement APIs.
vi.mock('@/components/code/LazyCodeEditor', () => ({
  LazyCodeEditor: ({
    value,
    onChange,
  }: {
    value: string
    language: string
    onChange: (value: string) => void
  }) => (
    <textarea
      className="cm-editor"
      data-testid="mock-code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

function Harness({
  initial,
  onState,
}: {
  initial: WalkthroughFormState
  onState?: (form: WalkthroughFormState) => void
}) {
  const [form, setForm] = useState(initial)
  return (
    <WalkthroughFields
      form={form}
      onChange={(next) => {
        setForm(next)
        onState?.(next)
      }}
    />
  )
}

function twoStepForm(): WalkthroughFormState {
  const form = emptyWalkthroughForm('deck-1')
  return {
    ...form,
    prompt: 'Trace it',
    scenario: 'A pointer holds a derived object.',
    codeValue: 'line one\nline two\nline three',
    steps: [
      { ...form.steps[0], id: 'step-1', prompt: 'Step one', recallAnswer: 'Answer one' },
      {
        ...form.steps[0],
        id: 'step-2',
        prompt: 'Step two',
        recallAnswer: 'Answer two',
      },
    ],
  }
}

describe('WalkthroughFields', () => {
  afterEach(() => cleanup())

  it('adds and removes steps, disabling remove at the 1-step floor', async () => {
    const user = userEvent.setup()
    render(<Harness initial={emptyWalkthroughForm('deck-1')} />)

    expect(screen.getAllByText(/^Step \d$/)).toHaveLength(1)
    expect((screen.getByRole('button', { name: 'Remove step 1' }) as HTMLButtonElement).disabled).toBe(
      true,
    )

    await user.click(screen.getByRole('button', { name: /Add step/ }))
    expect(screen.getAllByText(/^Step \d$/)).toHaveLength(2)
    expect(
      (screen.getAllByRole('button', { name: /Remove step/ })[0] as HTMLButtonElement).disabled,
    ).toBe(false)

    await user.click(screen.getAllByRole('button', { name: /Remove step/ })[1])
    expect(screen.getAllByText(/^Step \d$/)).toHaveLength(1)
  })

  it('move up/down reorders steps, preserving each step\'s id and own state, and keeps focus', async () => {
    const user = userEvent.setup()
    let latest: WalkthroughFormState | undefined
    render(<Harness initial={twoStepForm()} onState={(f) => (latest = f)} />)

    const moveDown = screen.getByRole('button', { name: 'Move step 1 down' })
    moveDown.focus()
    await user.keyboard('{Enter}')

    expect(latest?.steps.map((s) => [s.id, s.prompt, s.recallAnswer])).toEqual([
      ['step-2', 'Step two', 'Answer two'],
      ['step-1', 'Step one', 'Answer one'],
    ])
    expect(document.activeElement).toBe(moveDown)
  })

  it('the up control at the top of the list is a clean no-op', async () => {
    const user = userEvent.setup()
    let latest: WalkthroughFormState | undefined
    render(<Harness initial={twoStepForm()} onState={(f) => (latest = f)} />)

    await user.click(screen.getByRole('button', { name: 'Move step 1 up' }))
    expect(latest?.steps.map((s) => s.id)).toEqual(['step-1', 'step-2'])
  })

  it('switching response type resets the previous type\'s fields', async () => {
    const user = userEvent.setup()
    let latest: WalkthroughFormState | undefined
    render(<Harness initial={twoStepForm()} onState={(f) => (latest = f)} />)

    const mcButtons = screen.getAllByRole('button', { name: 'Multiple choice' })
    await user.click(mcButtons[0])

    expect(latest?.steps[0].responseType).toBe('multiple_choice')
    expect(latest?.steps[0].recallAnswer).toBe('')
    expect(latest?.steps[0].mcOptions).toHaveLength(2)
    // The other step is untouched.
    expect(latest?.steps[1].responseType).toBe('recall')
    expect(latest?.steps[1].recallAnswer).toBe('Answer two')
  })

  it('authors optional tip and explanation independently for each step', async () => {
    const user = userEvent.setup()
    let latest: WalkthroughFormState | undefined
    render(<Harness initial={twoStepForm()} onState={(f) => (latest = f)} />)

    const tips = screen.getAllByPlaceholderText(/A hint that only applies/)
    const explanations = screen.getAllByPlaceholderText(/Extra context shown after/)
    await user.type(tips[0], 'First hint')
    await user.type(explanations[0], 'First explanation')

    expect(latest?.steps[0].tip).toBe('First hint')
    expect(latest?.steps[0].explanation).toBe('First explanation')
    expect(latest?.steps[1].tip).toBe('')
    expect(latest?.steps[1].explanation).toBe('')
  })

  it('authors a multi-range highlight for a step: add/edit/remove independent ranges', async () => {
    const user = userEvent.setup()
    let latest: WalkthroughFormState | undefined
    render(<Harness initial={twoStepForm()} onState={(f) => (latest = f)} />)

    const addRangeButtons = screen.getAllByRole('button', { name: /Add highlighted range/ })
    await user.click(addRangeButtons[0])
    await user.click(addRangeButtons[0])
    expect(latest?.steps[0].ranges).toHaveLength(2)

    const starts = screen.getAllByLabelText('Start line')
    const ends = screen.getAllByLabelText('End line')
    await user.type(starts[0], '1')
    await user.type(ends[0], '1')
    await user.type(starts[1], '3')
    await user.type(ends[1], '3')

    expect(latest?.steps[0].ranges.map((r) => [r.start, r.end])).toEqual([
      ['1', '1'],
      ['3', '3'],
    ])

    const removeRangeButtons = screen.getAllByRole('button', { name: /Remove highlighted range/ })
    await user.click(removeRangeButtons[0])
    expect(latest?.steps[0].ranges).toHaveLength(1)
    // Untouched step is unaffected.
    expect(latest?.steps[1].ranges).toEqual([])
  })

  it('Multiple Choice: add/rename/mark-correct/remove options', async () => {
    const user = userEvent.setup()
    let latest: WalkthroughFormState | undefined
    render(<Harness initial={twoStepForm()} onState={(f) => (latest = f)} />)

    await user.click(screen.getAllByRole('button', { name: 'Multiple choice' })[0])
    await user.click(screen.getByRole('button', { name: /Add option/ }))
    expect(latest?.steps[0].mcOptions).toHaveLength(3)

    const optionInputs = screen.getAllByPlaceholderText('Option text')
    await user.type(optionInputs[2], 'Third option')
    expect(latest?.steps[0].mcOptions[2].text).toBe('Third option')

    await user.click(screen.getByRole('radio', { name: 'Mark option 3 correct' }))
    expect(latest?.steps[0].mcOptions.map((o) => o.correct)).toEqual([false, false, true])

    await user.click(screen.getAllByRole('button', { name: /Remove option 3/ })[0])
    expect(latest?.steps[0].mcOptions).toHaveLength(2)
  })

  it('exact-input: add/edit/remove accepted answers, floor at 1', async () => {
    const user = userEvent.setup()
    let latest: WalkthroughFormState | undefined
    render(<Harness initial={twoStepForm()} onState={(f) => (latest = f)} />)

    await user.click(screen.getAllByRole('button', { name: 'Exact answer' })[0])
    expect(latest?.steps[0].acceptedAnswers).toHaveLength(1)
    expect(
      (screen.getByRole('button', { name: 'Remove accepted answer' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    await user.type(screen.getByPlaceholderText(/Accepted answer/), 'undefined behavior')
    expect(latest?.steps[0].acceptedAnswers[0].text).toBe('undefined behavior')

    await user.click(screen.getByRole('button', { name: /Add accepted answer/ }))
    expect(latest?.steps[0].acceptedAnswers).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: 'Remove accepted answer' })[0])
    expect(latest?.steps[0].acceptedAnswers).toHaveLength(1)
  })

  it('shows inline validation errors and clears them once the form becomes valid', async () => {
    const user = userEvent.setup()
    const invalid: WalkthroughFormState = {
      ...emptyWalkthroughForm('deck-1'),
      prompt: '',
      scenario: '',
    }
    render(<Harness initial={invalid} />)

    expect(screen.getByText('Prompt is required.')).toBeTruthy()
    expect(screen.getByText('Scenario is required.')).toBeTruthy()
    expect(screen.getByText('Step 1 needs an answer.')).toBeTruthy()

    await user.type(screen.getByPlaceholderText(/Trace what happens/), 'Q')
    await user.type(screen.getByPlaceholderText(/The context every step/), 'Scenario')
    await user.type(screen.getByPlaceholderText(/What should the learner/), 'Prompt')
    await user.type(screen.getByPlaceholderText(/The answer revealed/), 'Answer')

    expect(screen.queryByText('Prompt is required.')).toBeNull()
    expect(screen.queryByText('Scenario is required.')).toBeNull()
    expect(screen.queryByText('Step 1 needs an answer.')).toBeNull()
  })

  it('surfaces a highlighted range that exceeds the shared code\'s line count', () => {
    const withBadRange: WalkthroughFormState = {
      ...twoStepForm(),
      steps: [
        { ...twoStepForm().steps[0], ranges: [{ id: 'r1', start: '1', end: '999' }] },
        twoStepForm().steps[1],
      ],
    }
    render(<Harness initial={withBadRange} />)
    expect(
      screen.getByText(/Step 1's highlighted range goes past the code's/),
    ).toBeTruthy()
  })
})
