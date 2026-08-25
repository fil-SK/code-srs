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

const card = demoCardOfType('matching')
const interaction = card.interaction as Extract<typeof card.interaction, { type: 'matching' }>
const [sourceColumn, valueColumn] = interaction.columns

function labelOf(columnIndex: number, itemId: string): string {
  const item = interaction.columns[columnIndex].items.find((entry) => entry.id === itemId)
  return stripInlineMarkers(item!.content.value)
}

/** Selects a source, then assigns it the value the card says is correct. */
async function matchCorrectly(sourceId: string) {
  fireEvent.press(screen.getByLabelText(new RegExp(`^${labelOf(0, sourceId)},`)))
  await settle()

  const truth = interaction.relationships.find((row) => row[sourceColumn.id] === sourceId)!
  fireEvent.press(screen.getByLabelText(new RegExp(`^${labelOf(1, truth[valueColumn.id])}`)))
  await settle()
}

describe('Matching in a session', () => {
  it('cannot be submitted until every relationship has a value', async () => {
    const { recorded } = await renderCard(card)

    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    // matchingBehavior's readiness, not a local rule.
    expect(screen.queryByText('How well did you recall it?')).toBeNull()
    expect(recorded.graded).toHaveLength(0)
  })

  it('tracks completion as matches are made', async () => {
    await renderCard(card)

    expect(screen.getByText(`0 of ${interaction.relationships.length} matches`)).toBeTruthy()

    await matchCorrectly(sourceColumn.items[0].id)

    expect(screen.getByText(`1 of ${interaction.relationships.length} matches`)).toBeTruthy()
  })

  it('scores a fully correct board as correct', async () => {
    await renderCard(card)

    for (const item of sourceColumn.items) await matchCorrectly(item.id)
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Every relationship is correct')).toBeTruthy()
    expect(screen.getByLabelText(/^Good,.*suggested$/)).toBeTruthy()
  })

  it('gives partial credit when some relationships are wrong', async () => {
    await renderCard(card)

    // One row right, the other two swapped. A value column that is not `fixed`
    // is exclusive, so reusing one value would unassign it elsewhere rather
    // than leaving the board complete.
    const assignments: [string, string][] = [
      [sourceColumn.items[0].id, valueColumn.items[0].id],
      [sourceColumn.items[1].id, valueColumn.items[2].id],
      [sourceColumn.items[2].id, valueColumn.items[1].id],
    ]

    for (const [sourceId, valueId] of assignments) {
      fireEvent.press(screen.getByLabelText(new RegExp(`^${labelOf(0, sourceId)},`)))
      await settle()
      fireEvent.press(screen.getByLabelText(new RegExp(`^${labelOf(1, valueId)}`)))
      await settle()
    }

    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText(/% of relationships correct/)).toBeTruthy()
    // Partial credit recommends Hard - a quieter hint than a flat Again.
    expect(screen.getByLabelText(/^Hard,.*suggested$/)).toBeTruthy()
  })

  it('leaves the final rating to the learner even when every match is right', async () => {
    const { recorded } = await renderCard(card)

    for (const item of sourceColumn.items) await matchCorrectly(item.id)
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(recorded.graded).toHaveLength(0)

    fireEvent.press(screen.getByLabelText(/^Hard,/))
    await settle()

    expect(recorded.graded).toHaveLength(1)
    expect(recorded.graded[0].log.rating).toBe(2)
    expect(recorded.graded[0].log.autoGraded).toBe(false)
  })

  it('takes the two-column board at the default width', async () => {
    await renderCard(card)

    // widthFor is matchingBehavior's, and says two columns fit the normal
    // surface - so the horizontal-scroll affordance is absent.
    expect(interaction.columns).toHaveLength(2)
    expect(screen.queryByText('Swipe sideways to view every column')).toBeNull()
  })
})
