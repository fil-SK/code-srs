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

const card = demoCardOfType('walkthrough')
const interaction = card.interaction as Extract<typeof card.interaction, { type: 'walkthrough' }>
const [exactStep, choiceStep, recallStep] = interaction.steps

/** Answers the current step correctly, whatever kind it is. */
async function answerStep(index: number) {
  const step = interaction.steps[index]
  if (step.response.type === 'exact_input') {
    fireEvent.changeText(
      screen.getByLabelText('Walkthrough step answer'),
      step.response.acceptedAnswers[0],
    )
    fireEvent.press(screen.getByText('Submit step'))
  } else if (step.response.type === 'multiple_choice') {
    const correct = step.response.options.find((option) => option.correct)!
    fireEvent.press(screen.getByLabelText(stripInlineMarkers(correct.content.value)))
    fireEvent.press(screen.getByText('Submit step'))
  } else {
    fireEvent.press(screen.getByText('Reveal answer'))
  }
  await settle()
}

async function walkToTheEnd() {
  for (let index = 0; index < interaction.steps.length; index++) {
    await answerStep(index)
    if (index < interaction.steps.length - 1) {
      fireEvent.press(screen.getByText('Continue'))
      await settle()
    }
  }
}

describe('Walkthrough in a session', () => {
  it('starts on the first step', async () => {
    await renderCard(card)

    expect(screen.getByText(`Step 1 of ${interaction.steps.length}`)).toBeTruthy()
    expect(screen.getByLabelText('Walkthrough step 1')).toBeTruthy()
  })

  it('does not offer Continue until the step is answered', async () => {
    await renderCard(card)

    expect(screen.queryByText('Continue')).toBeNull()

    await answerStep(0)

    expect(screen.getByText('Continue')).toBeTruthy()
  })

  it('progresses through every step', async () => {
    await renderCard(card)

    await answerStep(0)
    fireEvent.press(screen.getByText('Continue'))
    await settle()
    expect(screen.getByText(`Step 2 of ${interaction.steps.length}`)).toBeTruthy()

    await answerStep(1)
    fireEvent.press(screen.getByText('Continue'))
    await settle()
    expect(screen.getByText(`Step 3 of ${interaction.steps.length}`)).toBeTruthy()
  })

  it('grades each step as it is answered', async () => {
    await renderCard(card)

    fireEvent.changeText(
      screen.getByLabelText('Walkthrough step answer'),
      (exactStep.response as Extract<typeof exactStep.response, { type: 'exact_input' }>)
        .acceptedAnswers[0],
    )
    fireEvent.press(screen.getByText('Submit step'))
    await settle()

    expect(screen.getByText('Correct')).toBeTruthy()
  })

  it('locks the first submitted answer for a step', async () => {
    await renderCard(card)

    await answerStep(0)
    // Stepping back is inspection, not a second attempt: the response controls
    // are gone and the recorded result stands.
    expect(screen.queryByText('Submit step')).toBeNull()
    expect(screen.getByLabelText('Walkthrough step answer').props.editable).toBe(false)
  })

  it('lets the learner step back to inspect an answered step', async () => {
    await renderCard(card)

    await answerStep(0)
    fireEvent.press(screen.getByText('Continue'))
    await settle()
    fireEvent.press(screen.getByText('Previous'))
    await settle()

    expect(screen.getByText(`Step 1 of ${interaction.steps.length}`)).toBeTruthy()
  })

  it('shows the step tip before the answer and the step explanation after it', async () => {
    await renderCard(card)

    expect(screen.getByText('Tip for this step')).toBeTruthy()
    expect(screen.queryByText('Explanation for this step')).toBeNull()

    await answerStep(0)

    expect(screen.queryByText('Tip for this step')).toBeNull()
  })

  it('finishes into one aggregate result for the whole card', async () => {
    await renderCard(card)
    await walkToTheEnd()

    fireEvent.press(screen.getByText('Finish'))
    await settle()

    expect(screen.getByText('Complete')).toBeTruthy()
    expect(screen.getByText('Every objective step is correct')).toBeTruthy()
    expect(screen.getByText('How well did you recall it?')).toBeTruthy()
  })

  it('produces exactly one rating and one ReviewLog for the whole card', async () => {
    const { recorded } = await renderCard(card)
    await walkToTheEnd()

    fireEvent.press(screen.getByText('Finish'))
    await settle()
    // Three steps were answered, and nothing has been recorded yet.
    expect(recorded.graded).toHaveLength(0)

    fireEvent.press(screen.getByLabelText(/^Good,/))
    await settle()

    expect(recorded.graded).toHaveLength(1)
    expect(recorded.graded[0].log.cardId).toBe(card.id)
  })

  it('carries three steps, one of each response kind, so this covers all three renderers', () => {
    expect(exactStep.response.type).toBe('exact_input')
    expect(choiceStep.response.type).toBe('multiple_choice')
    expect(recallStep.response.type).toBe('recall')
  })
})
