// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Card, MultipleChoiceInteraction } from '@/types/card'
import { richText } from '@/types/card'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { multipleChoiceDefinition } from './index'
import { ReviewSessionScreen } from '../../ReviewSessionScreen'

const single: MultipleChoiceInteraction = {
  type: 'multiple_choice',
  selectionMode: 'single',
  randomizeOptions: false,
  options: [
    { id: 'opt-a', content: richText('int'), correct: true },
    { id: 'opt-b', content: richText('std::unique_ptr<T>'), correct: false },
    { id: 'opt-c', content: richText('std::vector<T>'), correct: false },
  ],
}

const multi: MultipleChoiceInteraction = {
  type: 'multiple_choice',
  selectionMode: 'multiple',
  randomizeOptions: false,
  options: [
    { id: 'opt-a', content: richText('A'), correct: true },
    { id: 'opt-b', content: richText('B'), correct: true },
    { id: 'opt-c', content: richText('C'), correct: false },
  ],
}

function fixture(interaction: MultipleChoiceInteraction): Card & { interaction: MultipleChoiceInteraction } {
  return {
    id: 'test-mc-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: richText('Pick the right one(s).'),
    interaction,
    tags: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

function isChecked(el: HTMLElement): boolean {
  return el.getAttribute('aria-checked') === 'true'
}

function renderScreen(interaction: MultipleChoiceInteraction) {
  return render(
    <ReviewSessionScreen
      card={fixture(interaction)}
      definition={multipleChoiceDefinition}
      current={1}
      total={1}
      onExit={() => {}}
      schedulingBefore={initialSchedulingState()}
    />,
  )
}

describe('MultipleChoiceView', () => {
  afterEach(() => cleanup())

  it('single-select: clicking another option replaces the selection, clicking it again clears it', async () => {
    const user = userEvent.setup()
    renderScreen(single)

    const optA = screen.getByRole('radio', { name: /int/ })
    const optB = screen.getByRole('radio', { name: /std::unique_ptr/ })

    await user.click(optA)
    expect(isChecked(optA)).toBe(true)

    await user.click(optB)
    expect(isChecked(optB)).toBe(true)
    expect(isChecked(optA)).toBe(false)

    await user.click(optB)
    expect(isChecked(optB)).toBe(false)
  })

  it('multi-select: two options can be selected simultaneously and deselected independently', async () => {
    const user = userEvent.setup()
    renderScreen(multi)

    const optA = screen.getByRole('checkbox', { name: 'A' })
    const optB = screen.getByRole('checkbox', { name: 'B' })

    await user.click(optA)
    await user.click(optB)
    expect(isChecked(optA)).toBe(true)
    expect(isChecked(optB)).toBe(true)

    await user.click(optA)
    expect(isChecked(optA)).toBe(false)
    expect(isChecked(optB)).toBe(true)
  })

  it('shows selection indicators and mode-specific footer guidance', () => {
    const { unmount } = renderScreen(multi)

    const multiOption = screen.getByRole('checkbox', { name: 'A' })
    expect(multiOption.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Choose one or more options')).toBeTruthy()

    unmount()
    renderScreen(single)
    expect(screen.getByText('Choose one option')).toBeTruthy()
  })

  it('rating is unavailable before submission, and Submit is disabled until a valid response exists', async () => {
    const user = userEvent.setup()
    renderScreen(single)

    expect(screen.queryByRole('button', { name: /again|hard|good|easy/i })).toBeNull()
    const submit = screen.getByRole('button', { name: 'Submit answer' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    await user.click(screen.getByRole('radio', { name: /int/ }))
    expect(submit.disabled).toBe(false)
  })

  it('shows correct, incorrect, and missed feedback after submission', async () => {
    const user = userEvent.setup()
    renderScreen(multi)

    // Select the one correct (A) and one incorrect (C); miss the other correct (B).
    await user.click(screen.getByRole('checkbox', { name: 'A' }))
    await user.click(screen.getByRole('checkbox', { name: 'C' }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('Incorrect')).toBeTruthy()
    expect(screen.getByText('Correct answer')).toBeTruthy() // missed B
    expect(screen.getAllByRole('button', { name: /again|hard|good|easy/i }).length).toBe(4)
  })

  it('a single Enter keypress on a focused option toggles selection only, without also submitting', async () => {
    const user = userEvent.setup()
    renderScreen(single)

    const optA = screen.getByRole('radio', { name: /int/ })
    optA.focus()
    await user.keyboard('{Enter}')
    expect(isChecked(optA)).toBe(true)
    // Still presenting: Submit button is still here and Correct/Incorrect banner is not.
    expect(screen.getByRole('button', { name: 'Submit answer' })).toBeTruthy()
    expect(screen.queryByText(/^(Correct|Incorrect)$/)).toBeNull()

    const optB = screen.getByRole('radio', { name: /std::unique_ptr/ })
    optB.focus()
    await user.keyboard('{Enter}')
    expect(isChecked(optB)).toBe(true)
    expect(isChecked(optA)).toBe(false)
    expect(screen.queryByText(/^(Correct|Incorrect)$/)).toBeNull()
  })

  it('Space also selects an option via the keyboard', async () => {
    const user = userEvent.setup()
    renderScreen(single)

    const optA = screen.getByRole('radio', { name: /int/ })
    optA.focus()
    await user.keyboard(' ')
    expect(isChecked(optA)).toBe(true)
  })

  it('randomizes display order when configured, but grades by option id regardless of position', async () => {
    vi.doMock('@/lib/shuffle', () => ({ shuffle: <T,>(arr: readonly T[]) => [...arr].reverse() }))
    vi.resetModules()

    const { ReviewSessionScreen: FreshScreen } = await import('../../ReviewSessionScreen')
    const { multipleChoiceDefinition: freshDefinition } = await import('./index')

    const randomized: MultipleChoiceInteraction = { ...single, randomizeOptions: true }
    const user = userEvent.setup()
    render(
      <FreshScreen
        card={fixture(randomized)}
        definition={freshDefinition}
        current={1}
        total={1}
        onExit={() => {}}
        schedulingBefore={initialSchedulingState()}
      />,
    )

    // Reversed display order: C, B, A.
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.textContent)).toEqual([
      'std::vector<T>',
      'std::unique_ptr<T>',
      'int',
    ])

    // Select the option that is correct in the underlying data (id 'opt-a', "int"),
    // which is now displayed last.
    await user.click(screen.getByRole('radio', { name: /int/ }))
    await user.click(screen.getByRole('button', { name: 'Submit answer' }))
    expect(await screen.findByText('Correct')).toBeTruthy()

    vi.doUnmock('@/lib/shuffle')
    vi.resetModules()
  })
})
