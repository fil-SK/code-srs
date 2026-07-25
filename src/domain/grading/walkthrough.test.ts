import { describe, expect, it } from 'vitest'
import type { WalkthroughInteraction, WalkthroughStep } from '@/types/cardV2'
import {
  aggregateWalkthroughResult,
  gradeWalkthroughStep,
  objectiveStepIds,
} from './walkthrough'

const recallStep: WalkthroughStep = {
  id: 'step-1',
  prompt: { format: 'markdown', value: 'What does this line do?' },
  response: { type: 'recall', answer: { format: 'markdown', value: 'It allocates.' } },
}

const mcStep: WalkthroughStep = {
  id: 'step-2',
  prompt: { format: 'markdown', value: 'Pick the true statements.' },
  response: {
    type: 'multiple_choice',
    selectionMode: 'single',
    options: [
      { id: 'opt-a', content: { format: 'markdown', value: 'Right' }, correct: true },
      { id: 'opt-b', content: { format: 'markdown', value: 'Wrong' }, correct: false },
    ],
  },
}

const exactStep: WalkthroughStep = {
  id: 'step-3',
  prompt: { format: 'markdown', value: 'Name the container.' },
  response: { type: 'exact_input', acceptedAnswers: ['vector', 'std::vector'] },
}

const interaction: WalkthroughInteraction = {
  type: 'walkthrough',
  scenario: { format: 'markdown', value: 'Scenario' },
  steps: [recallStep, mcStep, exactStep],
}

describe('gradeWalkthroughStep', () => {
  it('recall steps are self-graded: no objective result', () => {
    expect(gradeWalkthroughStep(recallStep, { type: 'recall', revealed: true })).toBeNull()
  })

  it('grades a multiple_choice step exactly', () => {
    expect(
      gradeWalkthroughStep(mcStep, { type: 'multiple_choice', selected: ['opt-a'] })?.correct,
    ).toBe(true)
    expect(
      gradeWalkthroughStep(mcStep, { type: 'multiple_choice', selected: ['opt-b'] })?.correct,
    ).toBe(false)
  })

  it('grades an exact_input step case-insensitively against any accepted answer', () => {
    expect(
      gradeWalkthroughStep(exactStep, { type: 'exact_input', value: 'Vector' })?.correct,
    ).toBe(true)
    expect(
      gradeWalkthroughStep(exactStep, { type: 'exact_input', value: 'std::vector' })?.correct,
    ).toBe(true)
    expect(
      gradeWalkthroughStep(exactStep, { type: 'exact_input', value: 'array' })?.correct,
    ).toBe(false)
  })
})

describe('objectiveStepIds', () => {
  it('excludes recall steps, which have nothing objective to grade', () => {
    expect(objectiveStepIds(interaction)).toEqual(['step-2', 'step-3'])
  })
})

describe('aggregateWalkthroughResult', () => {
  it('is null when every step is self-graded recall (nothing to aggregate)', () => {
    const recallOnly: WalkthroughInteraction = { ...interaction, steps: [recallStep] }
    expect(aggregateWalkthroughResult(recallOnly, {})).toBeNull()
  })

  it('aggregates correctness and score across only the objective steps', () => {
    const result = aggregateWalkthroughResult(interaction, {
      'step-2': { correct: true },
      'step-3': { correct: false },
    })
    expect(result?.correct).toBe(false)
    expect(result?.score).toBe(0.5)
  })

  it('is fully correct only when every objective step is correct', () => {
    const result = aggregateWalkthroughResult(interaction, {
      'step-2': { correct: true },
      'step-3': { correct: true },
    })
    expect(result?.correct).toBe(true)
    expect(result?.score).toBe(1)
  })
})
