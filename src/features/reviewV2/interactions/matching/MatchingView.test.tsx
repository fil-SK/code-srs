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

// Three columns — the maximum — with the third a shared list, so several terms
// can connect to the same value in it.
const threeColumnInteraction: MatchingInteraction = {
  type: 'matching',
  columns: [
    interaction.columns[0],
    interaction.columns[1],
    {
      id: 'region',
      label: 'Region',
      fixed: true,
      items: [
        { id: 'r1', content: richText('Automatic') },
        { id: 'r2', content: richText('Dynamic') },
      ],
    },
  ],
  relationships: [
    { source: 's1', target: 't1', region: 'r1' },
    { source: 's2', target: 't2', region: 'r2' },
  ],
}

function cardWith(i: MatchingInteraction): CardV2 & { interaction: MatchingInteraction } {
  return {
    id: 'test-matching-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: richText('Match each term to its definition.'),
    interaction: i,
    tags: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

function renderScreen(i: MatchingInteraction = interaction) {
  return render(
    <ReviewSessionScreen
      card={cardWith(i)}
      definition={matchingDefinition}
      current={1}
      total={1}
      onExit={() => {}}
      schedulingBefore={initialSchedulingState()}
    />,
  )
}

const LIFO = 'LIFO, function-call frames'
const MANUAL = 'Manually managed, arbitrary lifetime'

// The board states each pairing in the item's accessible name, so a connection
// is never conveyed by the drawn line (or its color) alone.
const unpaired = (label: string) => screen.getByRole('button', { name: `${label}, not paired` })
const pairedWith = (label: string, other: string) =>
  screen.getByRole('button', { name: `${label}, paired with ${other}` })

describe('MatchingView (two-column board)', () => {
  afterEach(() => cleanup())

  it('pairs a term with a value using only the keyboard (focus + Enter, no click)', async () => {
    const user = userEvent.setup()
    renderScreen()

    unpaired('Stack').focus()
    await user.keyboard('{Enter}')
    unpaired(LIFO).focus()
    await user.keyboard('{Enter}')

    expect(pairedWith('Stack', LIFO)).toBeTruthy()
    expect(pairedWith(LIFO, 'Stack')).toBeTruthy()
  })

  it('pairs value-first as well as term-first', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(unpaired(MANUAL))
    await user.click(unpaired('Heap'))

    expect(pairedWith('Heap', MANUAL)).toBeTruthy()
  })

  it('re-picking a term’s current value clears the pairing', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(unpaired('Stack'))
    await user.click(unpaired(LIFO))
    await user.click(pairedWith('Stack', LIFO))
    await user.click(pairedWith(LIFO, 'Stack'))

    expect(unpaired('Stack')).toBeTruthy()
  })

  it('tapping a connected value with nothing selected detaches it', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(unpaired('Stack'))
    await user.click(unpaired(LIFO))
    await user.click(pairedWith(LIFO, 'Stack'))

    expect(unpaired('Stack')).toBeTruthy()
    expect(unpaired(LIFO)).toBeTruthy()
  })

  it('giving a value to a second term moves it rather than pairing it twice', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(unpaired('Stack'))
    await user.click(unpaired(LIFO))

    await user.click(unpaired('Heap'))
    await user.click(pairedWith(LIFO, 'Stack'))

    expect(pairedWith(LIFO, 'Heap')).toBeTruthy()
    expect(unpaired('Stack')).toBeTruthy()
  })

  it('Submit stays disabled until every term is paired, then grades and preserves the answers', async () => {
    const user = userEvent.setup()
    renderScreen()

    const submit = screen.getByRole('button', { name: 'Submit answer' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    await user.click(unpaired('Stack'))
    await user.click(unpaired(LIFO))
    expect(submit.disabled).toBe(true) // Heap still unpaired

    await user.click(unpaired('Heap'))
    await user.click(unpaired(MANUAL))
    expect(submit.disabled).toBe(false)

    await user.click(submit)
    expect(await screen.findByText('Correct')).toBeTruthy()
    expect(screen.queryByText(/% of relationships correct/)).toBeNull()
  })

  it('an incorrect pairing is identified calmly, with the correct value stated in text', async () => {
    const user = userEvent.setup()
    renderScreen()

    // Swap the pairings so both are wrong.
    await user.click(unpaired('Stack'))
    await user.click(unpaired(MANUAL))
    await user.click(unpaired('Heap'))
    await user.click(unpaired(LIFO))

    await user.click(screen.getByRole('button', { name: 'Submit answer' }))

    expect(await screen.findByText('0% of relationships correct')).toBeTruthy()
    expect(screen.getAllByText(/Should be/).length).toBe(2)
  })
})

describe('MatchingView (three columns)', () => {
  afterEach(() => cleanup())

  it('names every column in a term’s accessible state, not just the first', async () => {
    const user = userEvent.setup()
    renderScreen(threeColumnInteraction)

    expect(
      screen.getByRole('button', { name: 'Stack, Definition: not set, Region: not set' }),
    ).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /^Stack, / }))
    await user.click(unpaired(LIFO))
    await user.click(screen.getByRole('button', { name: /^Stack, / }))
    await user.click(unpaired('Automatic'))

    expect(
      screen.getByRole('button', { name: `Stack, Definition: ${LIFO}, Region: Automatic` }),
    ).toBeTruthy()
  })

  it('continues a relationship along the chain: picking a value, then a value in the next column, fills the term that owns the first', async () => {
    const user = userEvent.setup()
    renderScreen(threeColumnInteraction)

    await user.click(screen.getByRole('button', { name: /^Heap, / }))
    await user.click(unpaired(MANUAL))

    // No term selected — the definition already belongs to Heap, so the Region
    // picked next lands on Heap without naming it again.
    await user.click(pairedWith(MANUAL, 'Heap'))
    await user.click(unpaired('Dynamic'))

    expect(
      screen.getByRole('button', { name: `Heap, Definition: ${MANUAL}, Region: Dynamic` }),
    ).toBeTruthy()
  })

  it('a shared-list value serves several terms at once, taking it from no one', async () => {
    const user = userEvent.setup()
    renderScreen(threeColumnInteraction)

    await user.click(screen.getByRole('button', { name: /^Stack, / }))
    await user.click(unpaired('Automatic'))
    await user.click(screen.getByRole('button', { name: /^Heap, / }))
    await user.click(pairedWith('Automatic', 'Stack'))

    expect(pairedWith('Automatic', 'Stack, Heap')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Stack, .*Region: Automatic/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Heap, .*Region: Automatic/ })).toBeTruthy()
  })
})
