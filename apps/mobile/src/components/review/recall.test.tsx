import { cleanup, fireEvent, screen } from '@testing-library/react-native'

import {
  demoCardOfType,
  renderCard,
  settle,
  mockReducedMotion,
} from '@/src/test/reviewHarness'

mockReducedMotion()
afterEach(cleanup)

const card = demoCardOfType('recall')

describe('Recall in a session', () => {
  it('shows the prompt and no rating controls before the reveal', async () => {
    await renderCard(card)

    expect(screen.getByLabelText('Recall card, question showing')).toBeTruthy()
    expect(screen.queryByText('How well did you recall it?')).toBeNull()
  })

  it('reveals the answer on tap, then asks for a rating', async () => {
    await renderCard(card)

    fireEvent.press(screen.getByLabelText('Recall card, question showing'))
    await settle()

    expect(screen.getByLabelText('Recall card, answer showing')).toBeTruthy()
    expect(screen.getByText('How well did you recall it?')).toBeTruthy()
  })

  it('suggests nothing, because Recall is self-graded', async () => {
    await renderCard(card)
    fireEvent.press(screen.getByLabelText('Recall card, question showing'))
    await settle()

    // No objective result exists, so no rating may be recommended.
    expect(screen.queryByText('Suggested')).toBeNull()
  })

  it('grades against the card s own scheduling and advances it', async () => {
    const { recorded } = await renderCard(card)

    fireEvent.press(screen.getByLabelText('Recall card, question showing'))
    await settle()
    fireEvent.press(screen.getByLabelText(/^Good,/))
    await settle()

    expect(recorded.graded).toHaveLength(1)
    const [result] = recorded.graded
    expect(result.log.cardId).toBe(card.id)
    expect(result.log.rating).toBe(3)
    // Self-graded: the learner chose it, so it is never recorded as auto-graded.
    expect(result.log.autoGraded).toBe(false)
    expect(result.log.stateBefore).toBe(card.scheduling.state)
    expect(result.after.due).toBeGreaterThan(card.scheduling.due)
    expect(result.after.reps).toBe(card.scheduling.reps + 1)
  })

  it('shows a real next interval on every rating button', async () => {
    await renderCard(card)
    fireEvent.press(screen.getByLabelText('Recall card, question showing'))
    await settle()

    // The four fixture strings ('<1m', '6m', '10m', '8d') are gone; these come
    // from the shared scheduler's preview of this card's own state.
    for (const label of ['Again', 'Hard', 'Good', 'Easy']) {
      const button = screen.getByLabelText(new RegExp(`^${label}, `))
      expect(button.props.accessibilityLabel).not.toBe(`${label}, `)
    }
  })

  it('records exactly one review however often the rating is pressed', async () => {
    const { recorded } = await renderCard(card)

    fireEvent.press(screen.getByLabelText('Recall card, question showing'))
    await settle()

    const good = screen.getByLabelText(/^Good,/)
    fireEvent.press(good)
    fireEvent.press(good)
    fireEvent.press(screen.getByLabelText(/^Again,/))
    await settle()

    expect(recorded.graded).toHaveLength(1)
    expect(recorded.graded[0].log.rating).toBe(3)
  })

  it('exits when the close control is used', async () => {
    const { recorded } = await renderCard(card)

    fireEvent.press(screen.getByLabelText('Exit review session'))
    expect(recorded.exits).toBe(1)
  })
})
