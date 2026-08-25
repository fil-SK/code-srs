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

const card = demoCardOfType('multiple_choice')
const interaction = card.interaction as Extract<
  typeof card.interaction,
  { type: 'multiple_choice' }
>
const label = (id: string) =>
  stripInlineMarkers(interaction.options.find((option) => option.id === id)!.content.value)
const correctIds = interaction.options.filter((option) => option.correct).map((option) => option.id)
const wrongIds = interaction.options.filter((option) => !option.correct).map((option) => option.id)

describe('Multiple Choice in a session', () => {
  it('refuses to submit with nothing selected', async () => {
    const { recorded } = await renderCard(card)

    const submit = screen.getByText('Submit answer')
    fireEvent.press(submit)
    await settle()

    // Readiness is multipleChoiceBehavior's, and it says an empty selection is
    // not a response.
    expect(screen.queryByText('How well did you recall it?')).toBeNull()
    expect(recorded.graded).toHaveLength(0)
  })

  it('accepts a selection and then submits', async () => {
    await renderCard(card)

    fireEvent.press(screen.getByLabelText(label(correctIds[0])))
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('How well did you recall it?')).toBeTruthy()
  })

  it('grades an exactly-correct set as correct and suggests Good', async () => {
    await renderCard(card)

    for (const id of correctIds) fireEvent.press(screen.getByLabelText(label(id)))
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Correct answer')).toBeTruthy()
    expect(screen.getByLabelText(/^Good,.*suggested$/)).toBeTruthy()
  })

  it('grades an incomplete set as incorrect', async () => {
    await renderCard(card)

    fireEvent.press(screen.getByLabelText(label(correctIds[0])))
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Review the highlighted choices')).toBeTruthy()
  })

  it('marks a wrong choice and a missed correct one distinctly', async () => {
    await renderCard(card)

    fireEvent.press(screen.getByLabelText(label(wrongIds[0])))
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    expect(screen.getByText('Incorrect')).toBeTruthy()
    expect(screen.getAllByText('Correct answer').length).toBeGreaterThan(0)
  })

  it('still requires the learner to choose the final rating', async () => {
    const { recorded } = await renderCard(card)

    for (const id of correctIds) fireEvent.press(screen.getByLabelText(label(id)))
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()

    // Objectively correct, and nothing has been recorded: correctness is not
    // recall quality, so the session waits.
    expect(recorded.graded).toHaveLength(0)

    fireEvent.press(screen.getByLabelText(/^Hard,/))
    await settle()

    expect(recorded.graded).toHaveLength(1)
    expect(recorded.graded[0].log.rating).toBe(2)
  })

  it('records a rating that matches the recommendation as auto-graded', async () => {
    const { recorded } = await renderCard(card)

    for (const id of correctIds) fireEvent.press(screen.getByLabelText(label(id)))
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()
    fireEvent.press(screen.getByLabelText(/^Good,/))
    await settle()

    expect(recorded.graded[0].log.autoGraded).toBe(true)
  })

  it('records an overridden rating as the learner s own', async () => {
    const { recorded } = await renderCard(card)

    for (const id of correctIds) fireEvent.press(screen.getByLabelText(label(id)))
    fireEvent.press(screen.getByText('Submit answer'))
    await settle()
    fireEvent.press(screen.getByLabelText(/^Again,/))
    await settle()

    expect(recorded.graded[0].log.rating).toBe(1)
    expect(recorded.graded[0].log.autoGraded).toBe(false)
  })
})
