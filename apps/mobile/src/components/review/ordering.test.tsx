import { stripInlineMarkers } from '@itera/core'
import { cleanup, fireEvent, screen } from '@testing-library/react-native'

import {
  demoCardOfType,
  renderCard,
  settle,
  mockReducedMotion,
} from '@/src/test/reviewHarness'

mockReducedMotion()
afterEach(cleanup)

const card = demoCardOfType('ordering')
const interaction = card.interaction as Extract<typeof card.interaction, { type: 'ordering' }>
const textOf = (id: string) =>
  stripInlineMarkers(interaction.items.find((item) => item.id === id)!.content.value)

/** The order the board is showing, read back from the visible move controls. */
function visibleOrder(): string[] {
  return screen
    .getAllByLabelText(/^Move .* up$/)
    .map((node) => String(node.props.accessibilityLabel).replace(/^Move /, '').replace(/ up$/, ''))
}

describe('Ordering in a session', () => {
  it('presents the items in an order the learner has to fix', async () => {
    await renderCard(card)

    expect(visibleOrder()).not.toEqual(interaction.correctOrder.map(textOf))
  })

  it('offers always-visible move controls, not only a drag handle', async () => {
    await renderCard(card)

    // Native has no keyboard-drag equivalent to web's Space-arrows-Space, so
    // these are the accessible path and are never hidden (master plan D7).
    expect(screen.getAllByLabelText(/^Move .* up$/)).toHaveLength(interaction.items.length)
    expect(screen.getAllByLabelText(/^Move .* down$/)).toHaveLength(interaction.items.length)
  })

  it('reorders when a move control is used', async () => {
    await renderCard(card)

    const before = visibleOrder()
    fireEvent.press(screen.getByLabelText(`Move ${before[1]} up`))
    await settle()

    const after = visibleOrder()
    expect(after[0]).toBe(before[1])
    expect(after[1]).toBe(before[0])
  })

  it('cannot move the first item up or the last item down', async () => {
    await renderCard(card)

    const order = visibleOrder()
    expect(screen.getByLabelText(`Move ${order[0]} up`).props.accessibilityState.disabled).toBe(true)
    expect(
      screen.getByLabelText(`Move ${order[order.length - 1]} down`).props.accessibilityState
        .disabled,
    ).toBe(true)
  })

  it('requires an explicit Submit - reordering alone reveals nothing', async () => {
    const { recorded } = await renderCard(card)

    const order = visibleOrder()
    fireEvent.press(screen.getByLabelText(`Move ${order[1]} up`))
    await settle()

    expect(screen.queryByText('How well did you recall it?')).toBeNull()
    expect(recorded.graded).toHaveLength(0)
  })

  it('scores a fully correct order as correct', async () => {
    await renderCard(card)

    // Walk each item into its correct position using the visible controls.
    for (let target = 0; target < interaction.correctOrder.length; target++) {
      const wanted = textOf(interaction.correctOrder[target])
      let from = visibleOrder().indexOf(wanted)
      while (from > target) {
        fireEvent.press(screen.getByLabelText(`Move ${wanted} up`))
        await settle()
        from -= 1
      }
    }

    expect(visibleOrder()).toEqual(interaction.correctOrder.map(textOf))

    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Correct order')).toBeTruthy()
    expect(screen.getByLabelText(/^Good,.*suggested$/)).toBeTruthy()
  })

  it('gives partial credit for a partly correct order', async () => {
    await renderCard(card)

    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    // gradeOrdering's partial score, shown as a percentage. Partial credit
    // recommends Hard rather than a flat Again.
    expect(screen.getByText(/% in the right position/)).toBeTruthy()
    expect(screen.getByText('CORRECT ORDER')).toBeTruthy()
    expect(screen.getByLabelText(/^(Hard|Again),.*suggested$/)).toBeTruthy()
  })

  it('leaves the final rating to the learner', async () => {
    const { recorded } = await renderCard(card)

    fireEvent.press(screen.getByText('Submit answer'))
    await settle()
    expect(recorded.graded).toHaveLength(0)

    fireEvent.press(screen.getByLabelText(/^Good,/))
    await settle()
    expect(recorded.graded).toHaveLength(1)
  })
})
