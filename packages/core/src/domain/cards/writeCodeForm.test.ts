import { describe, expect, it } from 'vitest'
import type { Card } from '../../types/card'
import {
  cardRecordToWriteCodeForm,
  emptyWriteCodeForm,
  validateWriteCodeForm,
  writeCodeFormToPreviewCard,
  writeCodeFormToRecord,
  type WriteCodeFormState,
} from './writeCodeForm'

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

const form: WriteCodeFormState = {
  deckId: 'deck-1',
  prompt: 'Sum all elements in v.',
  tip: 'A range-based for loop keeps this short.',
  explanation: 'Accumulating by reference avoids copies.',
  language: 'cpp',
  starterCode: 'int sum(const std::vector<int>& v) {\n    // your code here\n}',
  acceptedAnswers: [
    { id: 'a1', code: 'int sum(const std::vector<int>& v) { return 0; }' },
    { id: 'a2', code: 'int sum(const std::vector<int>& v) { return 1; }' },
  ],
  comparison: {
    trimOuterWhitespace: true,
    normalizeLineEndings: true,
    ignoreTrailingWhitespace: true,
    caseSensitive: true,
  },
  tags: 'cpp, algorithms, cpp',
}

describe('emptyWriteCodeForm', () => {
  it('starts blank with cpp language and one empty accepted answer', () => {
    const f = emptyWriteCodeForm('deck-2')
    expect(f.deckId).toBe('deck-2')
    expect(f.prompt).toBe('')
    expect(f.language).toBe('cpp')
    expect(f.starterCode).toBe('')
    expect(f.acceptedAnswers).toHaveLength(1)
    expect(f.acceptedAnswers[0].code).toBe('')
    expect(f.comparison).toEqual({
      trimOuterWhitespace: true,
      normalizeLineEndings: true,
      ignoreTrailingWhitespace: true,
      caseSensitive: true,
    })
  })
})

describe('writeCodeFormToPreviewCard', () => {
  it('builds a Card with the given id and no timestamps', () => {
    const card = writeCodeFormToPreviewCard(form, 'preview-id')
    expect(card.id).toBe('preview-id')
    expect(card.prompt).toEqual({ format: 'markdown', value: form.prompt })
    expect(card.interaction).toEqual({
      type: 'write_code',
      language: 'cpp',
      starterCode: form.starterCode,
      acceptedAnswers: [
        'int sum(const std::vector<int>& v) { return 0; }',
        'int sum(const std::vector<int>& v) { return 1; }',
      ],
      comparison: form.comparison,
    })
    expect(card.tags).toEqual(['cpp', 'algorithms']) // deduped
  })

  it('omits tip/explanation when blank', () => {
    const card = writeCodeFormToPreviewCard({ ...form, tip: '  ', explanation: '' }, 'x')
    expect(card.tip).toBeUndefined()
    expect(card.explanation).toBeUndefined()
  })
})

describe('writeCodeFormToRecord', () => {
  it('carries the envelope through and stamps updatedAt', () => {
    const record = writeCodeFormToRecord(
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
    expect(record.interaction.type).toBe('write_code')
  })
})

describe('cardRecordToWriteCodeForm round-trips', () => {
  // `satisfies` rather than an annotation: a `Card`-annotated literal widens
  // `interaction` to the union, and the comparison assertion below reads
  // `record.interaction.comparison`, which only Write Code carries.
  const record = {
    id: 'card-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: { format: 'markdown', value: 'Q' },
    tip: { format: 'markdown', value: 'hint' },
    explanation: { format: 'markdown', value: 'why' },
    interaction: {
      type: 'write_code',
      language: 'python',
      starterCode: 'def total(v):\n    pass',
      acceptedAnswers: ['def total(v):\n    return sum(v)'],
      comparison: {
        trimOuterWhitespace: true,
        normalizeLineEndings: true,
        ignoreTrailingWhitespace: false,
        caseSensitive: false,
      },
    },
    tags: ['x', 'y'],
    createdAt: 1,
    updatedAt: 2,
    suspended: false,
    scheduling,
  } satisfies Card

  it('round-trips a Card back into form state', () => {
    const f = cardRecordToWriteCodeForm(record)
    expect(f.deckId).toBe('deck-1')
    expect(f.prompt).toBe('Q')
    expect(f.tip).toBe('hint')
    expect(f.explanation).toBe('why')
    expect(f.language).toBe('python')
    expect(f.starterCode).toBe('def total(v):\n    pass')
    expect(f.acceptedAnswers.map((a) => a.code)).toEqual(['def total(v):\n    return sum(v)'])
    expect(f.comparison).toEqual(record.interaction.comparison)
    expect(f.tags).toBe('x, y')
  })

  it('formToRecord(recordToForm(record)) reproduces the same interaction shape', () => {
    const f = cardRecordToWriteCodeForm(record)
    const roundTripped = writeCodeFormToRecord(
      f,
      { id: record.id, createdAt: record.createdAt, suspended: record.suspended, scheduling: record.scheduling },
      record.updatedAt,
    )
    expect(roundTripped.interaction).toEqual(record.interaction)
    expect(roundTripped.tags).toEqual(record.tags)
  })

  it('throws for a Card that is not Write-Code-shaped', () => {
    const recallRecord: Card = {
      ...record,
      interaction: { type: 'recall', answer: { format: 'markdown', value: 'A' } },
    }
    expect(() => cardRecordToWriteCodeForm(recallRecord)).toThrow()
  })
})

describe('validateWriteCodeForm', () => {
  const valid: WriteCodeFormState = {
    deckId: 'deck-1',
    prompt: 'Q',
    tip: '',
    explanation: '',
    language: 'cpp',
    starterCode: '',
    acceptedAnswers: [{ id: 'a', code: 'return 0;' }],
    comparison: {
      trimOuterWhitespace: true,
      normalizeLineEndings: true,
      ignoreTrailingWhitespace: true,
      caseSensitive: true,
    },
    tags: '',
  }

  it('passes for a well-formed form with blank starter code', () => {
    expect(validateWriteCodeForm(valid)).toEqual({ canSave: true, errors: [] })
  })

  it('requires a prompt', () => {
    const result = validateWriteCodeForm({ ...valid, prompt: '  ' })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Prompt is required.')
  })

  it('requires at least one accepted answer', () => {
    const result = validateWriteCodeForm({ ...valid, acceptedAnswers: [] })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Add at least one accepted answer.')
  })

  it('requires every accepted answer to have code', () => {
    const result = validateWriteCodeForm({
      ...valid,
      acceptedAnswers: [valid.acceptedAnswers[0], { id: 'b', code: '   ' }],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('All accepted answers need code.')
  })

  it('allows multiple accepted answers', () => {
    const result = validateWriteCodeForm({
      ...valid,
      acceptedAnswers: [
        { id: 'a', code: 'return 0;' },
        { id: 'b', code: 'return 1;' },
      ],
    })
    expect(result.canSave).toBe(true)
  })
})
