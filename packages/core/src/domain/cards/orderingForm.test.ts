import { describe, expect, it } from 'vitest'
import type { Card } from '../../types/card'
import {
  cardRecordToOrderingForm,
  emptyOrderingForm,
  orderingFormToPreviewCard,
  orderingFormToRecord,
  validateOrderingForm,
  type OrderingFormState,
} from './orderingForm'

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

const form: OrderingFormState = {
  deckId: 'deck-1',
  prompt: 'Put these SSA construction steps in order.',
  tip: 'Think about dominance frontiers.',
  explanation: 'Phi nodes must be inserted before renaming.',
  randomize: true,
  items: [
    { id: 'item-a', text: 'Compute dominance frontiers' },
    { id: 'item-b', text: 'Insert phi nodes' },
    { id: 'item-c', text: 'Rename variables' },
  ],
  tags: 'compilers, ssa, ssa',
}

describe('emptyOrderingForm', () => {
  it('starts blank with three empty items and randomize off', () => {
    const f = emptyOrderingForm('deck-2')
    expect(f.deckId).toBe('deck-2')
    expect(f.prompt).toBe('')
    expect(f.randomize).toBe(false)
    expect(f.items).toHaveLength(3)
    const ids = f.items.map((i) => i.id)
    expect(new Set(ids).size).toBe(3) // stable, distinct ids
    expect(f.items.every((i) => i.text === '')).toBe(true)
  })
})

describe('orderingFormToPreviewCard', () => {
  it('builds a Card with the given id, no timestamps, and correctOrder derived from item order', () => {
    const card = orderingFormToPreviewCard(form, 'preview-id')
    expect(card.id).toBe('preview-id')
    expect(card.prompt).toEqual({ format: 'markdown', value: form.prompt })
    expect(card.interaction).toEqual({
      type: 'ordering',
      randomize: true,
      items: [
        { id: 'item-a', content: { format: 'markdown', value: 'Compute dominance frontiers' } },
        { id: 'item-b', content: { format: 'markdown', value: 'Insert phi nodes' } },
        { id: 'item-c', content: { format: 'markdown', value: 'Rename variables' } },
      ],
      correctOrder: ['item-a', 'item-b', 'item-c'],
    })
    expect(card.tags).toEqual(['compilers', 'ssa']) // deduped
  })

  it('omits tip/explanation when blank', () => {
    const card = orderingFormToPreviewCard({ ...form, tip: '  ', explanation: '' }, 'x')
    expect(card.tip).toBeUndefined()
    expect(card.explanation).toBeUndefined()
  })
})

describe('orderingFormToRecord', () => {
  it('carries the envelope through and stamps updatedAt', () => {
    const record = orderingFormToRecord(
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
    expect(record.interaction.type).toBe('ordering')
  })
})

describe('cardRecordToOrderingForm round-trips', () => {
  const record: Card = {
    id: 'card-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: { format: 'markdown', value: 'Q' },
    tip: { format: 'markdown', value: 'hint' },
    explanation: { format: 'markdown', value: 'why' },
    interaction: {
      type: 'ordering',
      randomize: false,
      items: [
        { id: 'i1', content: { format: 'markdown', value: 'First' } },
        { id: 'i2', content: { format: 'markdown', value: 'Second' } },
        { id: 'i3', content: { format: 'markdown', value: 'Third' } },
      ],
      correctOrder: ['i1', 'i2', 'i3'],
    },
    tags: ['x', 'y'],
    createdAt: 1,
    updatedAt: 2,
    suspended: false,
    scheduling,
  }

  it('round-trips a Card back into form state', () => {
    expect(cardRecordToOrderingForm(record)).toEqual({
      deckId: 'deck-1',
      prompt: 'Q',
      tip: 'hint',
      explanation: 'why',
      randomize: false,
      items: [
        { id: 'i1', text: 'First' },
        { id: 'i2', text: 'Second' },
        { id: 'i3', text: 'Third' },
      ],
      tags: 'x, y',
    })
  })

  it('formToRecord(recordToForm(record)) reproduces the same interaction shape', () => {
    const roundTripped = orderingFormToRecord(
      cardRecordToOrderingForm(record),
      { id: record.id, createdAt: record.createdAt, suspended: record.suspended, scheduling: record.scheduling },
      record.updatedAt,
    )
    expect(roundTripped.interaction).toEqual(record.interaction)
    expect(roundTripped.tags).toEqual(record.tags)
  })

  it('throws for a Card that is not Ordering-shaped', () => {
    const recallRecord: Card = {
      ...record,
      interaction: { type: 'recall', answer: { format: 'markdown', value: 'A' } },
    }
    expect(() => cardRecordToOrderingForm(recallRecord)).toThrow()
  })
})

describe('validateOrderingForm', () => {
  const valid: OrderingFormState = {
    deckId: 'deck-1',
    prompt: 'Q',
    tip: '',
    explanation: '',
    randomize: false,
    items: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    tags: '',
  }

  it('passes for a well-formed form', () => {
    expect(validateOrderingForm(valid)).toEqual({ canSave: true, errors: [] })
  })

  it('requires a prompt', () => {
    const result = validateOrderingForm({ ...valid, prompt: '  ' })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Prompt is required.')
  })

  it('requires at least 2 items', () => {
    const result = validateOrderingForm({ ...valid, items: [valid.items[0]] })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Add at least 2 items.')
  })

  it('requires every item to have text', () => {
    const result = validateOrderingForm({
      ...valid,
      items: [valid.items[0], { id: 'c', text: '  ' }],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('All items need text.')
  })
})
