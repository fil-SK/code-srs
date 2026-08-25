import { cleanup, fireEvent, screen } from '@testing-library/react-native'

import {
  demoCardOfType,
  renderCard,
  settle,
  mockReducedMotion,
} from '@/src/test/reviewHarness'

mockReducedMotion()
afterEach(cleanup)

const card = demoCardOfType('write_code')
const interaction = card.interaction as Extract<typeof card.interaction, { type: 'write_code' }>
const editorLabel = `${interaction.language} answer editor`

describe('Write Code in a session', () => {
  it('seeds the editor with the card s starter code', async () => {
    await renderCard(card)

    expect(screen.getByLabelText(editorLabel).props.value).toBe(interaction.starterCode)
  })

  it('accepts an answer that matches the card s accepted answer', async () => {
    const { recorded } = await renderCard(card)

    fireEvent.changeText(screen.getByLabelText(editorLabel), interaction.acceptedAnswers[0])
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Correct')).toBeTruthy()
    expect(screen.getByLabelText(/^Good,.*suggested$/)).toBeTruthy()
    // Objective feedback only - nothing is recorded until the learner rates.
    expect(recorded.graded).toHaveLength(0)
  })

  it('applies the card s own comparison settings rather than a strict match', async () => {
    await renderCard(card)

    // Trailing whitespace and outer blank lines are ignored by this card's
    // comparison, which is writeCodeBehavior's rule and not a local one.
    fireEvent.changeText(
      screen.getByLabelText(editorLabel),
      `\n${interaction.acceptedAnswers[0]}   \n`,
    )
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Correct')).toBeTruthy()
  })

  it('rejects a wrong answer and shows the expected one', async () => {
    await renderCard(card)

    fireEvent.changeText(screen.getByLabelText(editorLabel), 'int main() { return 0; }')
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Incorrect')).toBeTruthy()
    expect(screen.getByText('Expected answer')).toBeTruthy()
    expect(screen.getByLabelText(/^Again,.*suggested$/)).toBeTruthy()
  })

  it('hides the expected answer when the learner got it right', async () => {
    await renderCard(card)

    fireEvent.changeText(screen.getByLabelText(editorLabel), interaction.acceptedAnswers[0])
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.queryByText('Expected answer')).toBeNull()
  })

  it('never executes or compiles anything - it only compares text', async () => {
    await renderCard(card)

    // A string that would be a syntax error in any compiler is simply not a
    // match, and produces feedback rather than a crash.
    fireEvent.changeText(screen.getByLabelText(editorLabel), 'this is not code <<<')
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Incorrect')).toBeTruthy()
  })

  it('still leaves the final rating to the learner', async () => {
    const { recorded } = await renderCard(card)

    fireEvent.changeText(screen.getByLabelText(editorLabel), interaction.acceptedAnswers[0])
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()
    fireEvent.press(screen.getByLabelText(/^Easy,/))
    await settle()

    expect(recorded.graded).toHaveLength(1)
    expect(recorded.graded[0].log.rating).toBe(4)
    expect(recorded.graded[0].log.autoGraded).toBe(false)
  })

  it('locks the editor once submitted', async () => {
    await renderCard(card)

    fireEvent.changeText(screen.getByLabelText(editorLabel), interaction.acceptedAnswers[0])
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByLabelText(editorLabel).props.editable).toBe(false)
  })
})
