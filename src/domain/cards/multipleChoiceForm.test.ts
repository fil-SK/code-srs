import { describe, expect, it } from 'vitest'
import type { Card } from '@/types/card'
import {
  cardRecordToMultipleChoiceForm,
  emptyMultipleChoiceForm,
  multipleChoiceFormToPreviewCard,
  multipleChoiceFormToRecord,
  validateMultipleChoiceForm,
  type MultipleChoiceFormState,
} from './multipleChoiceForm'

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

const form: MultipleChoiceFormState = {
  deckId: 'deck-1',
  prompt: 'Which of these is a value type in C++?',
  tip: 'Think about copy semantics.',
  explanation: 'Structs and primitives are value types by default.',
  selectionMode: 'single',
  randomizeOptions: false,
  options: [
    { id: 'opt-a', text: 'int', correct: true },
    { id: 'opt-b', text: 'std::unique_ptr<T>', correct: false },
  ],
  tags: 'cpp, types, cpp',
}

describe('emptyMultipleChoiceForm', () => {
  it('starts blank with two empty single-select options', () => {
    const f = emptyMultipleChoiceForm('deck-2')
    expect(f.deckId).toBe('deck-2')
    expect(f.prompt).toBe('')
    expect(f.selectionMode).toBe('single')
    expect(f.randomizeOptions).toBe(false)
    expect(f.options).toHaveLength(2)
    expect(f.options[0].id).not.toBe(f.options[1].id)
    expect(f.options.every((o) => o.text === '' && o.correct === false)).toBe(true)
  })
})

describe('multipleChoiceFormToPreviewCard', () => {
  it('builds a Card with the given id and no timestamps', () => {
    const card = multipleChoiceFormToPreviewCard(form, 'preview-id')
    expect(card.id).toBe('preview-id')
    expect(card.prompt).toEqual({ format: 'markdown', value: form.prompt })
    expect(card.interaction).toEqual({
      type: 'multiple_choice',
      selectionMode: 'single',
      randomizeOptions: false,
      options: [
        { id: 'opt-a', content: { format: 'markdown', value: 'int' }, correct: true },
        {
          id: 'opt-b',
          content: { format: 'markdown', value: 'std::unique_ptr<T>' },
          correct: false,
        },
      ],
    })
    expect(card.tags).toEqual(['cpp', 'types']) // deduped
  })

  it('omits tip/explanation when blank', () => {
    const card = multipleChoiceFormToPreviewCard({ ...form, tip: '  ', explanation: '' }, 'x')
    expect(card.tip).toBeUndefined()
    expect(card.explanation).toBeUndefined()
  })
})

describe('multipleChoiceFormToRecord', () => {
  it('carries the envelope through and stamps updatedAt', () => {
    const record = multipleChoiceFormToRecord(
      form,
      { id: 'card-1', createdAt: 500, suspended: true, scheduling, order: 3 },
      9000,
    )
    expect(record.id).toBe('card-1')
    expect(record.createdAt).toBe(500)
    expect(record.updatedAt).toBe(9000)
    expect(record.suspended).toBe(true)
    expect(record.scheduling).toEqual(scheduling)
    expect(record.order).toBe(3)
    expect(record.deckId).toBe('deck-1')
    expect(record.interaction.type).toBe('multiple_choice')
  })
})

describe('cardRecordToMultipleChoiceForm round-trips', () => {
  const record: Card = {
    id: 'card-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: { format: 'markdown', value: 'Q' },
    tip: { format: 'markdown', value: 'hint' },
    explanation: { format: 'markdown', value: 'why' },
    interaction: {
      type: 'multiple_choice',
      selectionMode: 'multiple',
      randomizeOptions: true,
      options: [
        { id: 'o1', content: { format: 'markdown', value: 'A' }, correct: true },
        { id: 'o2', content: { format: 'markdown', value: 'B' }, correct: true },
        { id: 'o3', content: { format: 'markdown', value: 'C' }, correct: false },
      ],
    },
    tags: ['x', 'y'],
    createdAt: 1,
    updatedAt: 2,
    suspended: false,
    scheduling,
  }

  it('round-trips a Card back into form state', () => {
    expect(cardRecordToMultipleChoiceForm(record)).toEqual({
      deckId: 'deck-1',
      prompt: 'Q',
      tip: 'hint',
      explanation: 'why',
      selectionMode: 'multiple',
      randomizeOptions: true,
      options: [
        { id: 'o1', text: 'A', correct: true },
        { id: 'o2', text: 'B', correct: true },
        { id: 'o3', text: 'C', correct: false },
      ],
      tags: 'x, y',
    })
  })

  it('formToRecord(recordToForm(record)) reproduces the same interaction shape', () => {
    const roundTripped = multipleChoiceFormToRecord(
      cardRecordToMultipleChoiceForm(record),
      { id: record.id, createdAt: record.createdAt, suspended: record.suspended, scheduling: record.scheduling },
      record.updatedAt,
    )
    expect(roundTripped.interaction).toEqual(record.interaction)
    expect(roundTripped.tags).toEqual(record.tags)
  })

  it('throws for a Card that is not Multiple Choice-shaped', () => {
    const recallRecord: Card = {
      ...record,
      interaction: { type: 'recall', answer: { format: 'markdown', value: 'A' } },
    }
    expect(() => cardRecordToMultipleChoiceForm(recallRecord)).toThrow()
  })


  it('throws for a legacy card that is not Multiple-Choice-shaped', () => {
    const card: Card = {
      id: 'c2',
      deckId: 'd1',
      tags: [],
      createdAt: 1,
      updatedAt: 2,
      suspended: false,
      scheduling,
      type: 'basic',
      content: { front: 'Q', back: 'A' },
    }
    expect(() => legacyMcqCardToForm(card)).toThrow()
  })
})

describe('validateMultipleChoiceForm', () => {
  const valid: MultipleChoiceFormState = {
    deckId: 'deck-1',
    prompt: 'Q',
    tip: '',
    explanation: '',
    selectionMode: 'single',
    randomizeOptions: false,
    options: [
      { id: 'a', text: 'A', correct: true },
      { id: 'b', text: 'B', correct: false },
    ],
    tags: '',
  }

  it('passes for a well-formed single-select form', () => {
    expect(validateMultipleChoiceForm(valid)).toEqual({ canSave: true, errors: [] })
  })

  it('requires a prompt', () => {
    const result = validateMultipleChoiceForm({ ...valid, prompt: '  ' })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Prompt is required.')
  })

  it('requires at least 2 options', () => {
    const result = validateMultipleChoiceForm({ ...valid, options: [valid.options[0]] })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Add at least 2 options.')
  })

  it('requires every option to have text', () => {
    const result = validateMultipleChoiceForm({
      ...valid,
      options: [valid.options[0], { id: 'c', text: '  ', correct: false }],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('All options need text.')
  })

  it('requires at least one correct option', () => {
    const result = validateMultipleChoiceForm({
      ...valid,
      options: valid.options.map((o) => ({ ...o, correct: false })),
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Mark at least one option as correct.')
  })

  it('rejects more than one correct option in single-select mode (a hand-built invalid state)', () => {
    const result = validateMultipleChoiceForm({
      ...valid,
      selectionMode: 'single',
      options: valid.options.map((o) => ({ ...o, correct: true })),
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Single-select cards can only have one correct option.')
  })

  it('allows multiple correct options in multiple-select mode', () => {
    const result = validateMultipleChoiceForm({
      ...valid,
      selectionMode: 'multiple',
      options: valid.options.map((o) => ({ ...o, correct: true })),
    })
    expect(result.canSave).toBe(true)
  })
})
