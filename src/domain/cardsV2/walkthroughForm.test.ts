import { describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import type { CardV2Record } from '@/types/cardV2'
import {
  addWalkthroughAcceptedAnswer,
  addWalkthroughMcOption,
  addWalkthroughRange,
  addWalkthroughStep,
  cardV2RecordToWalkthroughForm,
  emptyWalkthroughForm,
  legacyStoryCardToForm,
  moveWalkthroughMcOption,
  moveWalkthroughStep,
  removeWalkthroughAcceptedAnswer,
  removeWalkthroughMcOption,
  removeWalkthroughRange,
  removeWalkthroughStep,
  renameWalkthroughMcOption,
  setWalkthroughMcSelectionMode,
  setWalkthroughStepResponseType,
  toggleWalkthroughMcOptionCorrect,
  updateWalkthroughAcceptedAnswer,
  updateWalkthroughRange,
  updateWalkthroughRecallAnswer,
  updateWalkthroughStepExplanation,
  updateWalkthroughStepPrompt,
  updateWalkthroughStepTip,
  validateWalkthroughForm,
  walkthroughFormToPreviewCard,
  walkthroughFormToRecord,
  type WalkthroughFormState,
} from './walkthroughForm'

const scheduling = {
  due: 1000,
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  learningSteps: 0,
  state: 'new' as const,
}

const twoStep: WalkthroughFormState = {
  deckId: 'deck-1',
  prompt: 'Trace this function.',
  tip: 'Watch the vtable.',
  explanation: 'Virtual dispatch resolves at the call site.',
  scenario: 'A Base pointer holds a Derived object.',
  codeLanguage: 'cpp',
  codeValue: 'struct Base {\n  virtual void f();\n};\nstruct Derived : Base {\n  void f() override;\n};',
  image: undefined,
  steps: [
    {
      id: 'step-1',
      prompt: 'What runs first?',
      tip: 'Look at the virtual keyword.',
      explanation: 'The override controls dispatch.',
      ranges: [{ id: 'r1', start: '2', end: '2' }],
      responseType: 'recall',
      recallAnswer: 'Base::f is overridden',
      mcSelectionMode: 'single',
      mcOptions: [],
      acceptedAnswers: [],
    },
    {
      id: 'step-2',
      prompt: 'Which function actually runs?',
      tip: '',
      explanation: '',
      ranges: [],
      responseType: 'multiple_choice',
      recallAnswer: '',
      mcSelectionMode: 'single',
      mcOptions: [
        { id: 'opt-a', text: 'Base::f', correct: false },
        { id: 'opt-b', text: 'Derived::f', correct: true },
      ],
      acceptedAnswers: [],
    },
  ],
  tags: 'cpp, virtual, virtual',
}

describe('emptyWalkthroughForm', () => {
  it('starts blank with one Recall step and a stable id', () => {
    const f = emptyWalkthroughForm('deck-2')
    expect(f.deckId).toBe('deck-2')
    expect(f.steps).toHaveLength(1)
    expect(f.steps[0].responseType).toBe('recall')
    expect(f.steps[0].id).toBeTruthy()
  })
})

describe('walkthroughFormToPreviewCard', () => {
  it('builds a WalkthroughInteraction with per-step focus ranges and response shapes', () => {
    const card = walkthroughFormToPreviewCard(twoStep, 'preview-id')
    expect(card.id).toBe('preview-id')
    expect(card.interaction.type).toBe('walkthrough')
    expect(card.interaction.scenario).toEqual({ format: 'markdown', value: twoStep.scenario })
    expect(card.interaction.code).toEqual({ language: 'cpp', value: twoStep.codeValue })
    expect(card.interaction.steps).toHaveLength(2)
    expect(card.interaction.steps[0].focus).toEqual([{ startLine: 2, endLine: 2 }])
    expect(card.interaction.steps[0].tip).toEqual({
      format: 'markdown',
      value: 'Look at the virtual keyword.',
    })
    expect(card.interaction.steps[0].explanation).toEqual({
      format: 'markdown',
      value: 'The override controls dispatch.',
    })
    expect(card.interaction.steps[1].tip).toBeUndefined()
    expect(card.interaction.steps[1].explanation).toBeUndefined()
    expect(card.interaction.steps[0].response).toEqual({
      type: 'recall',
      answer: { format: 'markdown', value: 'Base::f is overridden' },
    })
    expect(card.interaction.steps[1].response).toEqual({
      type: 'multiple_choice',
      selectionMode: 'single',
      options: [
        { id: 'opt-a', content: { format: 'markdown', value: 'Base::f' }, correct: false },
        { id: 'opt-b', content: { format: 'markdown', value: 'Derived::f' }, correct: true },
      ],
    })
    expect(card.tags).toEqual(['cpp', 'virtual']) // deduped
  })

  it('omits code when codeValue is blank, and omits an empty range list as undefined focus', () => {
    const noCode = { ...twoStep, codeValue: '' }
    const card = walkthroughFormToPreviewCard(noCode, 'x')
    expect(card.interaction.code).toBeUndefined()
    expect(card.interaction.steps[1].focus).toBeUndefined()
  })

  it('builds an exact_input step response from accepted answers', () => {
    const withExact: WalkthroughFormState = {
      ...twoStep,
      steps: [
        {
          ...twoStep.steps[0],
          responseType: 'exact_input',
          acceptedAnswers: [
            { id: 'a1', text: 'undefined behavior' },
            { id: 'a2', text: 'UB' },
          ],
        },
      ],
    }
    const card = walkthroughFormToPreviewCard(withExact, 'x')
    expect(card.interaction.steps[0].response).toEqual({
      type: 'exact_input',
      acceptedAnswers: ['undefined behavior', 'UB'],
    })
  })

  it('drops invalid ranges (start after end, non-positive) rather than persisting them', () => {
    const withBadRanges: WalkthroughFormState = {
      ...twoStep,
      steps: [
        {
          ...twoStep.steps[0],
          ranges: [
            { id: 'r1', start: '5', end: '2' }, // start after end
            { id: 'r2', start: '0', end: '3' }, // non-positive
            { id: 'r3', start: '1', end: '1' }, // valid
          ],
        },
        twoStep.steps[1],
      ],
    }
    const card = walkthroughFormToPreviewCard(withBadRanges, 'x')
    expect(card.interaction.steps[0].focus).toEqual([{ startLine: 1, endLine: 1 }])
  })
})

describe('walkthroughFormToRecord', () => {
  it('carries the envelope through and stamps updatedAt', () => {
    const record = walkthroughFormToRecord(
      twoStep,
      { id: 'card-1', createdAt: 500, suspended: true, scheduling, order: 3 },
      9000,
    )
    expect(record.id).toBe('card-1')
    expect(record.createdAt).toBe(500)
    expect(record.updatedAt).toBe(9000)
    expect(record.suspended).toBe(true)
    expect(record.scheduling).toEqual(scheduling)
    expect(record.order).toBe(3)
    expect(record.interaction.type).toBe('walkthrough')
  })
})

describe('cardV2RecordToWalkthroughForm round-trip', () => {
  const record: CardV2Record = {
    id: 'card-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: { format: 'markdown', value: 'Trace this function.' },
    tip: { format: 'markdown', value: 'hint' },
    explanation: { format: 'markdown', value: 'why' },
    interaction: {
      type: 'walkthrough',
      scenario: { format: 'markdown', value: 'A pointer holds a derived object.' },
      code: { language: 'cpp', value: 'int x = 1;' },
      steps: [
        {
          id: 's1',
          focus: [
            { startLine: 2, endLine: 4 },
            { startLine: 8, endLine: 8 },
          ],
          prompt: { format: 'markdown', value: 'Step one' },
          tip: { format: 'markdown', value: 'Step hint' },
          explanation: { format: 'markdown', value: 'Step context' },
          response: { type: 'recall', answer: { format: 'markdown', value: 'Answer one' } },
        },
        {
          id: 's2',
          prompt: { format: 'markdown', value: 'Step two' },
          response: {
            type: 'exact_input',
            acceptedAnswers: ['ub', 'undefined behavior'],
          },
        },
      ],
    },
    tags: ['x', 'y'],
    createdAt: 1,
    updatedAt: 2,
    suspended: false,
    scheduling,
  }

  it('round-trips a CardV2Record back into form state, including multi-range focus', () => {
    const form = cardV2RecordToWalkthroughForm(record)
    expect(form.deckId).toBe('deck-1')
    expect(form.scenario).toBe('A pointer holds a derived object.')
    expect(form.codeValue).toBe('int x = 1;')
    expect(form.steps).toHaveLength(2)
    expect(form.steps[0].ranges.map((r) => [r.start, r.end])).toEqual([
      ['2', '4'],
      ['8', '8'],
    ])
    expect(form.steps[0].responseType).toBe('recall')
    expect(form.steps[0].recallAnswer).toBe('Answer one')
    expect(form.steps[0].tip).toBe('Step hint')
    expect(form.steps[0].explanation).toBe('Step context')
    expect(form.steps[1].tip).toBe('')
    expect(form.steps[1].explanation).toBe('')
    expect(form.steps[1].responseType).toBe('exact_input')
    expect(form.steps[1].acceptedAnswers.map((a) => a.text)).toEqual(['ub', 'undefined behavior'])
    expect(form.tags).toBe('x, y')
  })

  it('formToRecord(recordToForm(record)) reproduces the same interaction shape', () => {
    const roundTripped = walkthroughFormToRecord(
      cardV2RecordToWalkthroughForm(record),
      {
        id: record.id,
        createdAt: record.createdAt,
        suspended: record.suspended,
        scheduling: record.scheduling,
      },
      record.updatedAt,
    )
    expect(roundTripped.interaction).toEqual(record.interaction)
    expect(roundTripped.tags).toEqual(record.tags)
  })

  it('throws for a CardV2Record that is not Walkthrough-shaped', () => {
    const recallRecord: CardV2Record = {
      ...record,
      interaction: { type: 'recall', answer: { format: 'markdown', value: 'A' } },
    }
    expect(() => cardV2RecordToWalkthroughForm(recallRecord)).toThrow()
  })
})

describe('legacyStoryCardToForm', () => {
  it('hydrates a legacy story card, parsing its multi-range highlight spec into range rows', () => {
    const card: Card = {
      id: 'c1',
      deckId: 'd1',
      tags: ['tag'],
      createdAt: 1,
      updatedAt: 2,
      suspended: false,
      scheduling,
      type: 'story',
      content: {
        intro: 'Trace it',
        code: { language: 'cpp', code: 'class A {};' },
        steps: [
          { id: 's1', prompt: 'What runs first?', answer: 'Base ctor', highlight: '26-34, 40' },
        ],
      },
    }
    const hydrated = legacyStoryCardToForm(card)
    expect(hydrated.deckId).toBe('d1')
    expect(hydrated.tags).toBe('tag')
    expect(hydrated.steps).toHaveLength(1)
    expect(hydrated.steps[0].responseType).toBe('recall')
    expect(hydrated.steps[0].recallAnswer).toBe('Base ctor')
    expect(hydrated.steps[0].ranges.map((r) => [r.start, r.end])).toEqual([
      ['26', '34'],
      ['40', '40'],
    ])
  })

  it('throws for a legacy card that is not Walkthrough-shaped', () => {
    const card: Card = {
      id: 'c3',
      deckId: 'd1',
      tags: [],
      createdAt: 1,
      updatedAt: 2,
      suspended: false,
      scheduling,
      type: 'basic',
      content: { front: 'Q', back: 'A' },
    }
    expect(() => legacyStoryCardToForm(card)).toThrow()
  })
})

describe('validateWalkthroughForm', () => {
  it('passes for a well-formed two-step form', () => {
    expect(validateWalkthroughForm(twoStep)).toEqual({ canSave: true, errors: [] })
  })

  it('requires a prompt', () => {
    const result = validateWalkthroughForm({ ...twoStep, prompt: '  ' })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Prompt is required.')
  })

  it('requires a scenario', () => {
    const result = validateWalkthroughForm({ ...twoStep, scenario: '  ' })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Scenario is required.')
  })

  it('requires at least one step', () => {
    const result = validateWalkthroughForm({ ...twoStep, steps: [] })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Add at least one step.')
  })

  it('requires every step to have a prompt', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [{ ...twoStep.steps[0], prompt: '  ' }, twoStep.steps[1]],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Step 1 needs a prompt.')
  })

  it('requires a Recall step to have an answer', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [{ ...twoStep.steps[0], recallAnswer: '  ' }, twoStep.steps[1]],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Step 1 needs an answer.')
  })

  it('requires a Multiple Choice step to have at least one correct option', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [
        twoStep.steps[0],
        { ...twoStep.steps[1], mcOptions: twoStep.steps[1].mcOptions.map((o) => ({ ...o, correct: false })) },
      ],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Step 2 needs at least one correct option.')
  })

  it('rejects a single-select Multiple Choice step with more than one correct option', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [
        twoStep.steps[0],
        { ...twoStep.steps[1], mcOptions: twoStep.steps[1].mcOptions.map((o) => ({ ...o, correct: true })) },
      ],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Step 2 is single-select but has more than one correct option.')
  })

  it('requires an exact-input step to have at least one non-blank accepted answer', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [
        { ...twoStep.steps[0], responseType: 'exact_input', acceptedAnswers: [{ id: 'a1', text: '  ' }] },
        twoStep.steps[1],
      ],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Step 1 needs at least one accepted answer.')
  })

  it('rejects an inverted range (start after end)', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [
        { ...twoStep.steps[0], ranges: [{ id: 'r1', start: '10', end: '2' }] },
        twoStep.steps[1],
      ],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain("Step 1's line range starts after it ends.")
  })

  it('rejects a range when no shared code exists', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      codeValue: '',
      steps: [
        { ...twoStep.steps[0], ranges: [{ id: 'r1', start: '1', end: '1' }] },
        twoStep.steps[1],
      ],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Step 1 highlights lines, but no shared code was added.')
  })

  it('dedupes identical range errors when two ranges on the same step fail the same way', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [
        {
          ...twoStep.steps[0],
          ranges: [
            { id: 'r1', start: '', end: '' },
            { id: 'r2', start: '', end: '' },
          ],
        },
        twoStep.steps[1],
      ],
    })
    expect(result.canSave).toBe(false)
    const occurrences = result.errors.filter((e) => e === 'Step 1 has an invalid line range.')
    expect(occurrences).toHaveLength(1)
  })

  it('surfaces a range that goes past the code\'s actual line count', () => {
    const result = validateWalkthroughForm({
      ...twoStep,
      steps: [
        { ...twoStep.steps[0], ranges: [{ id: 'r1', start: '1', end: '999' }] },
        twoStep.steps[1],
      ],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors.some((e) => e.includes("Step 1's highlighted range goes past the code's"))).toBe(
      true,
    )
  })
})

describe('pure mutation helpers', () => {
  it('addWalkthroughStep/removeWalkthroughStep/moveWalkthroughStep preserve stable ids and each step own state', () => {
    let form = addWalkthroughStep(twoStep)
    expect(form.steps).toHaveLength(3)
    const newStepId = form.steps[2].id
    expect(newStepId).not.toBe('step-1')
    expect(newStepId).not.toBe('step-2')

    form = moveWalkthroughStep(form, newStepId, -1)
    expect(form.steps.map((s) => s.id)).toEqual(['step-1', newStepId, 'step-2'])
    // The other two steps' own state is untouched by the reorder.
    expect(form.steps.find((s) => s.id === 'step-1')?.recallAnswer).toBe('Base::f is overridden')
    expect(form.steps.find((s) => s.id === 'step-2')?.mcOptions).toHaveLength(2)

    form = removeWalkthroughStep(form, newStepId)
    expect(form.steps.map((s) => s.id)).toEqual(['step-1', 'step-2'])
  })

  it('moveWalkthroughStep is a no-op past the boundaries', () => {
    expect(moveWalkthroughStep(twoStep, 'step-1', -1)).toBe(twoStep)
    expect(moveWalkthroughStep(twoStep, 'step-2', 1)).toBe(twoStep)
  })

  it('removeWalkthroughStep does not corrupt the remaining step', () => {
    const removed = removeWalkthroughStep(twoStep, 'step-1')
    expect(removed.steps).toHaveLength(1)
    expect(removed.steps[0]).toEqual(twoStep.steps[1])
  })

  it('updates one step\'s prompt, tip, explanation, and answer without touching the other', () => {
    const updated = updateWalkthroughStepPrompt(twoStep, 'step-1', 'New prompt')
    expect(updated.steps[0].prompt).toBe('New prompt')
    expect(updated.steps[1].prompt).toBe('Which function actually runs?')

    const withAnswer = updateWalkthroughRecallAnswer(twoStep, 'step-1', 'New answer')
    expect(withAnswer.steps[0].recallAnswer).toBe('New answer')

    const withTip = updateWalkthroughStepTip(twoStep, 'step-1', 'New tip')
    expect(withTip.steps[0].tip).toBe('New tip')
    expect(withTip.steps[1].tip).toBe('')

    const withExplanation = updateWalkthroughStepExplanation(
      twoStep,
      'step-1',
      'New explanation',
    )
    expect(withExplanation.steps[0].explanation).toBe('New explanation')
    expect(withExplanation.steps[1].explanation).toBe('')
  })

  it('setWalkthroughStepResponseType resets every type-specific field for the newly chosen type', () => {
    const asExact = setWalkthroughStepResponseType(twoStep, 'step-2', 'exact_input')
    const step = asExact.steps[1]
    expect(step.responseType).toBe('exact_input')
    expect(step.mcOptions).toEqual([])
    expect(step.recallAnswer).toBe('')
    expect(step.acceptedAnswers).toHaveLength(1)
    expect(step.acceptedAnswers[0].text).toBe('')
  })

  it('range helpers add/update/remove one range without touching other steps', () => {
    let form = addWalkthroughRange(twoStep, 'step-2')
    expect(form.steps[1].ranges).toHaveLength(1)
    const rangeId = form.steps[1].ranges[0].id

    form = updateWalkthroughRange(form, 'step-2', rangeId, { start: '3', end: '5' })
    expect(form.steps[1].ranges[0]).toEqual({ id: rangeId, start: '3', end: '5' })
    expect(form.steps[0].ranges).toEqual(twoStep.steps[0].ranges) // untouched

    form = removeWalkthroughRange(form, 'step-2', rangeId)
    expect(form.steps[1].ranges).toEqual([])
  })

  it('MC option helpers add/rename/reorder/remove without corrupting other options', () => {
    let form = addWalkthroughMcOption(twoStep, 'step-2')
    expect(form.steps[1].mcOptions).toHaveLength(3)
    const newOptionId = form.steps[1].mcOptions[2].id

    form = renameWalkthroughMcOption(form, 'step-2', newOptionId, 'Neither')
    expect(form.steps[1].mcOptions[2].text).toBe('Neither')

    form = moveWalkthroughMcOption(form, 'step-2', newOptionId, -1)
    expect(form.steps[1].mcOptions.map((o) => o.id)).toEqual(['opt-a', newOptionId, 'opt-b'])

    form = removeWalkthroughMcOption(form, 'step-2', newOptionId)
    expect(form.steps[1].mcOptions.map((o) => o.id)).toEqual(['opt-a', 'opt-b'])
  })

  it('toggleWalkthroughMcOptionCorrect enforces single-select exclusivity', () => {
    const toggled = toggleWalkthroughMcOptionCorrect(twoStep, 'step-2', 'opt-a')
    expect(toggled.steps[1].mcOptions.map((o) => o.correct)).toEqual([true, false])
  })

  it('setWalkthroughMcSelectionMode(single) trims down to the first correct option', () => {
    const multi = setWalkthroughMcSelectionMode(twoStep, 'step-2', 'multiple')
    const bothCorrect = toggleWalkthroughMcOptionCorrect(multi, 'step-2', 'opt-a')
    expect(bothCorrect.steps[1].mcOptions.map((o) => o.correct)).toEqual([true, true])

    const backToSingle = setWalkthroughMcSelectionMode(bothCorrect, 'step-2', 'single')
    expect(backToSingle.steps[1].mcOptions.map((o) => o.correct)).toEqual([true, false])
  })

  it('accepted-answer helpers add/update/remove without touching other steps', () => {
    let form = addWalkthroughAcceptedAnswer(twoStep, 'step-1')
    expect(form.steps[0].acceptedAnswers).toHaveLength(1)
    const answerId = form.steps[0].acceptedAnswers[0].id

    form = updateWalkthroughAcceptedAnswer(form, 'step-1', answerId, 'RVO')
    expect(form.steps[0].acceptedAnswers[0].text).toBe('RVO')

    form = removeWalkthroughAcceptedAnswer(form, 'step-1', answerId)
    expect(form.steps[0].acceptedAnswers).toEqual([])
  })
})
