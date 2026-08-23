// @vitest-environment happy-dom
//
// No `interaction.code` in this fixture — happy-dom doesn't support what
// CodeMirror needs (ResizeObserver, layout measurement), same constraint
// documented in ReviewSessionScreen.test.tsx's Recall fixture.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Card, WalkthroughInteraction, WalkthroughStep } from '@/types/card'
import { richText } from '@/types/card'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { walkthroughDefinition } from './index'
import { ReviewSessionScreen } from '../../ReviewSessionScreen'

const step1: WalkthroughStep = {
  id: 'step-1',
  prompt: richText('Which statement about std::move is true?'),
  tip: richText('Think about the type of the expression.'),
  explanation: richText('The cast enables overload resolution; it does not move bytes.'),
  response: {
    type: 'multiple_choice',
    selectionMode: 'single',
    options: [
      { id: 'opt-a', content: richText('It casts to an rvalue reference.'), correct: true },
      { id: 'opt-b', content: richText('It moves memory immediately.'), correct: false },
    ],
  },
}

const step2: WalkthroughStep = {
  id: 'step-2',
  prompt: richText('Name the special member function that does the actual work.'),
  tip: richText('It has the same name as the class.'),
  explanation: richText('The move constructor receives the rvalue reference.'),
  response: { type: 'exact_input', acceptedAnswers: ['move constructor'] },
}

const interaction: WalkthroughInteraction = {
  type: 'walkthrough',
  scenario: richText('A short scenario for context.'),
  steps: [step1, step2],
}

const fixture: Card & { interaction: WalkthroughInteraction } = {
  id: 'test-walkthrough-1',
  schemaVersion: 2,
  deckId: 'deck-1',
  prompt: richText('Walk through this.'),
  tip: richText('Overall walkthrough hint.'),
  explanation: richText('Wrap-up explanation text.'),
  interaction,
  tags: [],
  createdAt: 0,
  updatedAt: 0,
}

function renderScreen() {
  return render(
    <ReviewSessionScreen
      card={fixture}
      definition={walkthroughDefinition}
      current={1}
      total={1}
      onExit={() => {}}
      schedulingBefore={initialSchedulingState()}
    />,
  )
}

async function answerStep1Correctly(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /rvalue reference/ }))
  await user.click(screen.getByRole('button', { name: 'Submit' }))
}

describe('WalkthroughView', () => {
  afterEach(() => cleanup())

  it('shows no Explanation or rating controls before every step is complete', () => {
    renderScreen()
    expect(screen.queryByText('Wrap-up explanation text.')).toBeNull()
    expect(screen.queryByRole('button', { name: /Good/ })).toBeNull()
  })

  it('Continue is hidden until the current step is answered, then advances to the next step', async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()

    await answerStep1Correctly(user)

    const cont = screen.getByRole('button', { name: 'Continue' })
    await user.click(cont)

    expect(screen.getByText('Step 2 of 2')).toBeTruthy()
    expect(screen.getByText(step2.prompt.value)).toBeTruthy()
  })

  it('shows the active step tip before submission and its explanation after submission', async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(screen.getByText('Think about the type of the expression.')).toBeTruthy()
    expect(screen.getByText('Overall walkthrough hint.')).toBeTruthy()
    expect(screen.queryByText('The cast enables overload resolution; it does not move bytes.')).toBeNull()
    expect(screen.queryByText('It has the same name as the class.')).toBeNull()

    await answerStep1Correctly(user)

    expect(screen.queryByText('Think about the type of the expression.')).toBeNull()
    expect(screen.getByText('The cast enables overload resolution; it does not move bytes.')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('It has the same name as the class.')).toBeTruthy()
    expect(screen.queryByText('The cast enables overload resolution; it does not move bytes.')).toBeNull()
    expect(screen.getByText('Overall walkthrough hint.')).toBeTruthy()
  })

  it('a step already answered cannot be resubmitted (first submission wins) when revisited', async () => {
    const user = userEvent.setup()
    renderScreen()

    await answerStep1Correctly(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Go back to step 1 — it must render read-only, no Submit button.
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull()
  })

  it('the final step shows Finish, not Continue, and completing it reveals the Explanation and rating', async () => {
    const user = userEvent.setup()
    renderScreen()

    await answerStep1Correctly(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Step 2: exact_input, answered incorrectly on purpose to exercise partial scoring.
    await user.type(screen.getByRole('textbox'), 'destructor')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    const finish = screen.getByRole('button', { name: 'Finish' })
    expect(screen.queryByText('Wrap-up explanation text.')).toBeNull()
    await user.click(finish)

    expect(await screen.findByText('Wrap-up explanation text.')).toBeTruthy()
    // One of two steps correct -> partial credit -> suggested rating is Hard (2),
    // shown as a quiet highlight, not auto-selected (learner still chooses).
    const hard = screen.getByRole('button', { name: /Hard/ })
    expect(hard.className).toMatch(/border-itera-accent/)
  })

  it('aggregates per-step correctness into a fully-correct card result when every step is right', async () => {
    const user = userEvent.setup()
    renderScreen()

    await answerStep1Correctly(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await user.type(screen.getByRole('textbox'), 'move constructor')
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    await screen.findByText('Wrap-up explanation text.')
    const good = screen.getByRole('button', { name: /Good/ })
    expect(good.className).toMatch(/border-itera-accent/)
  })

  it('does not steal focus on initial mount, but moves focus to the new step panel after Continue', async () => {
    const user = userEvent.setup()
    renderScreen()
    expect(document.activeElement).toBe(document.body)

    await answerStep1Correctly(user)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    const step2Prompt = screen.getByText(step2.prompt.value)
    expect(document.activeElement?.contains(step2Prompt)).toBe(true)
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1')
  })

  it('accepts a seeded initialResponse so a caller can start mid-sequence (used by the editor\'s live preview)', () => {
    render(
      <ReviewSessionScreen
        card={fixture}
        definition={walkthroughDefinition}
        current={1}
        total={1}
        onExit={() => {}}
        schedulingBefore={initialSchedulingState()}
        initialResponse={{
          stepIndex: 1,
          answers: { 'step-1': { type: 'multiple_choice', selected: [] } },
          results: {},
        }}
      />,
    )
    expect(screen.getByText('Step 2 of 2')).toBeTruthy()
    expect(screen.getByText(step2.prompt.value)).toBeTruthy()
  })
})
