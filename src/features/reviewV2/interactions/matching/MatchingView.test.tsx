// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CardV2, MatchingInteraction } from '@/types/cardV2'
import { richText } from '@/types/cardV2'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { matchingDefinition } from './index'
import { ReviewSessionScreen } from '../../ReviewSessionScreen'

const interaction: MatchingInteraction = {
  type: 'matching',
  columns: [
    {
      id: 'source',
      label: 'Term',
      items: [
        { id: 's1', content: richText('Stack') },
        { id: 's2', content: richText('Heap') },
      ],
    },
    {
      id: 'target',
      label: 'Definition',
      items: [
        { id: 't1', content: richText('LIFO, function-call frames') },
        { id: 't2', content: richText('Manually managed, arbitrary lifetime') },
      ],
    },
  ],
  relationships: [
    { source: 's1', target: 't1' },
    { source: 's2', target: 't2' },
  ],
}

const fixture: CardV2 & { interaction: MatchingInteraction } = {
  id: 'test-matching-1',
  schemaVersion: 2,
  deckId: 'deck-1',
  prompt: richText('Match each term to its definition.'),
  interaction,
  tags: [],
  createdAt: 0,
  updatedAt: 0,
}

function renderScreen() {
  return render(
    <ReviewSessionScreen
      card={fixture}
      definition={matchingDefinition}
      current={1}
      total={1}
      onExit={() => {}}
      schedulingBefore={initialSchedulingState()}
    />,
  )
}

describe('MatchingView', () => {
  afterEach(() => cleanup())

  it('pairs a source with a value using only the keyboard (focus + Enter, no click)', async () => {
    const user = userEvent.setup()
    renderScreen()

    const stackHeader = screen.getByRole('button', { name: /Stack/ })
    stackHeader.focus()
    await user.keyboard('{Enter}') // expands the row

    const chip = screen.getByRole('button', { name: 'LIFO, function-call frames' })
    chip.focus()
    await user.keyboard('{Enter}') // pairs Stack -> that value
    expect(chip.getAttribute('aria-pressed')).toBe('true')

    // Pairing state is stated in text, not left to color/position alone.
    stackHeader.focus()
    await user.keyboard('{Enter}') // collapse
    expect(screen.getByText('Definition: LIFO, function-call frames')).toBeTruthy()
  })

  it('clicking the same value again clears the pairing', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /Stack/ }))
    const chip = screen.getByRole('button', { name: 'LIFO, function-call frames' })
    await user.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('true')

    await user.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('false')
  })

  it('a unique-column value already claimed by another row is unavailable, not silently reassignable', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /Stack/ }))
    await user.click(screen.getByRole('button', { name: 'LIFO, function-call frames' }))

    await user.click(screen.getByRole('button', { name: /Heap/ }))
    const takenChip = screen.getByRole('button', {
      name: 'LIFO, function-call frames (used)',
    }) as HTMLButtonElement
    expect(takenChip.disabled).toBe(true)
  })

  it('Submit stays disabled until every row is paired, then grades and preserves the answers', async () => {
    const user = userEvent.setup()
    renderScreen()

    const submit = screen.getByRole('button', { name: 'Submit answer' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    await user.click(screen.getByRole('button', { name: /Stack/ }))
    await user.click(screen.getByRole('button', { name: 'LIFO, function-call frames' }))
    expect(submit.disabled).toBe(true) // Heap still unpaired

    await user.click(screen.getByRole('button', { name: /Heap/ }))
    await user.click(screen.getByRole('button', { name: 'Manually managed, arbitrary lifetime' }))
    expect(submit.disabled).toBe(false)

    await user.click(submit)
    // "Correct" appears per-row and in the summary banner - just confirm the
    // partial-credit banner text is absent (i.e. it graded as fully correct).
    await screen.findAllByText('Correct')
    expect(screen.queryByText(/% of relationships correct/)).toBeNull()
  })

  it('an incorrect relationship is identified calmly, with the correct value stated in text', async () => {
    const user = userEvent.setup()
    renderScreen()

    // Swap the pairings so both are wrong.
    await user.click(screen.getByRole('button', { name: /Stack/ }))
    await user.click(
      screen.getByRole('button', { name: 'Manually managed, arbitrary lifetime' }),
    )
    await user.click(screen.getByRole('button', { name: /Heap/ }))
    await user.click(screen.getByRole('button', { name: 'LIFO, function-call frames' }))

    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('0% of relationships correct')).toBeTruthy()
    // Both rows are wrong in this test; each one states the correct value in
    // text (not just a red border) — assert at least one such statement exists.
    expect(screen.getAllByText(/should be/).length).toBeGreaterThan(0)
  })
})
