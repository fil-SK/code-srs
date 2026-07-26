import { describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import type { CardV2Record } from '@/types/cardV2'
import {
  cardV2RecordToOrderingForm,
  emptyOrderingForm,
  legacyOrderingCardToForm,
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
  it('builds a CardV2 with the given id, no timestamps, and correctOrder derived from item order', () => {
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

describe('cardV2RecordToOrderingForm / legacyOrderingCardToForm round-trips', () => {
  const record: CardV2Record = {
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

  it('round-trips a CardV2Record back into form state', () => {
    expect(cardV2RecordToOrderingForm(record)).toEqual({
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
      cardV2RecordToOrderingForm(record),
      { id: record.id, createdAt: record.createdAt, suspended: record.suspended, scheduling: record.scheduling },
      record.updatedAt,
    )
    expect(roundTripped.interaction).toEqual(record.interaction)
    expect(roundTripped.tags).toEqual(record.tags)
  })

  it('throws for a CardV2Record that is not Ordering-shaped', () => {
    const recallRecord: CardV2Record = {
      ...record,
      interaction: { type: 'recall', answer: { format: 'markdown', value: 'A' } },
    }
    expect(() => cardV2RecordToOrderingForm(recallRecord)).toThrow()
  })

  it('hydrates from a legacy v1 ordering card via migrateCard', () => {
    const card: Card = {
      id: 'c1',
      deckId: 'd1',
      tags: ['tag'],
      createdAt: 1,
      updatedAt: 2,
      suspended: false,
      scheduling,
      type: 'ordering',
      content: {
        prompt: 'Order these',
        items: [
          { id: 'i1', text: 'First' },
          { id: 'i2', text: 'Second' },
        ],
        explanation: 'because',
      },
    }
    const hydrated = legacyOrderingCardToForm(card)
    expect(hydrated.deckId).toBe('d1')
    expect(hydrated.prompt).toBe('Order these')
    expect(hydrated.explanation).toBe('because')
    // v1 items are stored in correct order and always presented shuffled to
    // the learner, so migration sets randomize: true to preserve behavior.
    expect(hydrated.randomize).toBe(true)
    expect(hydrated.items).toEqual([
      { id: 'i1', text: 'First' },
      { id: 'i2', text: 'Second' },
    ])
    expect(hydrated.tags).toBe('tag')
  })

  it('throws for a legacy card that is not Ordering-shaped', () => {
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
    expect(() => legacyOrderingCardToForm(card)).toThrow()
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
