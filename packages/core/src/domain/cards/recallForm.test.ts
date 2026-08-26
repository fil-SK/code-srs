import { describe, expect, it } from 'vitest'
import {
  cardRecordToForm,
  emptyRecallForm,
  recallFormToPreviewCard,
  recallFormToRecord,
  validateRecallForm,
} from './recallForm'
import type { Card } from '../../types/card'

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

const form = {
  deckId: 'deck-1',
  prompt: 'What is SSA form?',
  tip: 'Think about assignment counts.',
  explanation: 'Used to simplify optimizations.',
  answer: 'Static Single Assignment.',
  authoringPreset: 'standard' as const,
  tags: 'ssa, compilers, ssa',
}

describe('emptyRecallForm', () => {
  it('starts blank with the standard preset', () => {
    const f = emptyRecallForm('deck-2')
    expect(f).toEqual({
      deckId: 'deck-2',
      prompt: '',
      tip: '',
      explanation: '',
      answer: '',
      authoringPreset: 'standard',
      tags: '',
    })
  })
})

describe('recallFormToPreviewCard', () => {
  it('builds a Card with the given id and no timestamps', () => {
    const card = recallFormToPreviewCard(form, 'preview-id')
    expect(card.id).toBe('preview-id')
    expect(card.prompt).toEqual({ format: 'markdown', value: form.prompt })
    expect(card.interaction).toEqual({
      type: 'recall',
      authoringPreset: 'standard',
      answer: { format: 'markdown', value: form.answer },
    })
    expect(card.tags).toEqual(['ssa', 'compilers']) // deduped
  })

  it('omits tip/explanation when blank', () => {
    const card = recallFormToPreviewCard({ ...form, tip: '  ', explanation: '' }, 'x')
    expect(card.tip).toBeUndefined()
    expect(card.explanation).toBeUndefined()
  })
})

describe('recallFormToRecord', () => {
  it('carries the envelope through and stamps updatedAt', () => {
    const record = recallFormToRecord(
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
  })
})

describe('cardRecordToForm round-trips', () => {
  it('round-trips a Card back into form state', () => {
    const record: Card = {
      id: 'card-1',
      schemaVersion: 2,
      deckId: 'deck-1',
      prompt: { format: 'markdown', value: 'Q' },
      tip: { format: 'markdown', value: 'hint' },
      explanation: { format: 'markdown', value: 'why' },
      interaction: { type: 'recall', authoringPreset: 'find_the_bug', answer: { format: 'markdown', value: 'A' } },
      tags: ['x', 'y'],
      createdAt: 1,
      updatedAt: 2,
      suspended: false,
      scheduling,
    }
    expect(cardRecordToForm(record)).toEqual({
      deckId: 'deck-1',
      prompt: 'Q',
      tip: 'hint',
      explanation: 'why',
      answer: 'A',
      authoringPreset: 'find_the_bug',
      tags: 'x, y',
    })
  })
})

describe('validateRecallForm', () => {
  it('accepts a form with both a prompt and an answer', () => {
    const form = { ...emptyRecallForm('deck-1'), prompt: 'Q', answer: 'A' }
    expect(validateRecallForm(form)).toEqual({ canSave: true, errors: [] })
  })

  it('requires a prompt', () => {
    const form = { ...emptyRecallForm('deck-1'), prompt: '   ', answer: 'A' }
    expect(validateRecallForm(form)).toEqual({
      canSave: false,
      errors: ['Prompt is required.'],
    })
  })

  it('requires an answer', () => {
    const form = { ...emptyRecallForm('deck-1'), prompt: 'Q', answer: '   ' }
    expect(validateRecallForm(form)).toEqual({
      canSave: false,
      errors: ['Answer is required.'],
    })
  })

  it('reports both failures on an empty form', () => {
    expect(validateRecallForm(emptyRecallForm())).toEqual({
      canSave: false,
      errors: ['Prompt is required.', 'Answer is required.'],
    })
  })

  // The three optional fields are optional on purpose: a Recall card with no
  // tip, explanation or tags is an ordinary card, not an incomplete one.
  it('does not require tip, explanation, tags or a deck', () => {
    const form = { ...emptyRecallForm(), prompt: 'Q', answer: 'A' }
    expect(form.tip).toBe('')
    expect(form.explanation).toBe('')
    expect(form.tags).toBe('')
    expect(form.deckId).toBe('')
    expect(validateRecallForm(form).canSave).toBe(true)
  })

  it('agrees with the rule the web editor gated Save on before extraction', () => {
    const inlineRule = (f: { prompt: string; answer: string }) =>
      f.prompt.trim().length > 0 && f.answer.trim().length > 0
    const cases = [
      ['', ''],
      ['Q', ''],
      ['', 'A'],
      ['Q', 'A'],
      [' ', ' '],
      ['  Q  ', '  A  '],
    ] as const
    for (const [prompt, answer] of cases) {
      const form = { ...emptyRecallForm('deck-1'), prompt, answer }
      expect(validateRecallForm(form).canSave).toBe(inlineRule(form))
    }
  })
})
