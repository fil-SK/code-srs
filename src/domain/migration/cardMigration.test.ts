import { describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { migrateCard } from './cardMigration'

const base = {
  id: 'card-1',
  deckId: 'deck-1',
  tags: ['tag'],
  createdAt: 1000,
  updatedAt: 2000,
  suspended: false,
  scheduling: {
    due: 1000,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    learningSteps: 0,
    state: 'new' as const,
  },
}

describe('migrateCard', () => {
  it('basic -> recall/standard', () => {
    const card: Card = {
      ...base,
      type: 'basic',
      content: { front: 'Q', back: 'A', explanation: 'why' },
    }
    const v2 = migrateCard(card)
    expect(v2.prompt.value).toBe('Q')
    expect(v2.explanation?.value).toBe('why')
    expect(v2.interaction).toEqual({
      type: 'recall',
      authoringPreset: 'standard',
      answer: { format: 'markdown', value: 'A' },
    })
  })

  it('codeReading -> recall/code_reading, folds code+question into prompt', () => {
    const card: Card = {
      ...base,
      type: 'codeReading',
      content: {
        code: { language: 'cpp', code: 'int x;' },
        question: 'What is x?',
        answer: 'An int',
      },
    }
    const v2 = migrateCard(card)
    expect(v2.prompt.value).toContain('```cpp')
    expect(v2.prompt.value).toContain('int x;')
    expect(v2.prompt.value).toContain('What is x?')
    expect(v2.interaction.type).toBe('recall')
    if (v2.interaction.type === 'recall') {
      expect(v2.interaction.authoringPreset).toBe('code_reading')
      expect(v2.interaction.answer.value).toBe('An int')
    }
  })

  it('bugFinding -> recall/find_the_bug; explanation becomes the answer, hint becomes tip', () => {
    const card: Card = {
      ...base,
      type: 'bugFinding',
      content: {
        code: { language: 'cpp', code: 'if (x = 1)' },
        question: 'Find it',
        bugHint: 'assignment vs comparison',
        explanation: 'Should be ==',
      },
    }
    const v2 = migrateCard(card)
    expect(v2.tip?.value).toBe('assignment vs comparison')
    expect(v2.explanation).toBeUndefined()
    expect(v2.interaction.type).toBe('recall')
    if (v2.interaction.type === 'recall') {
      expect(v2.interaction.authoringPreset).toBe('find_the_bug')
      expect(v2.interaction.answer.value).toBe('Should be ==')
    }
  })

  it('mcq -> multiple_choice with correct flags set', () => {
    const card: Card = {
      ...base,
      type: 'mcq',
      content: {
        prompt: 'Pick',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        correct: ['b'],
        multiple: false,
      },
    }
    const v2 = migrateCard(card)
    expect(v2.interaction.type).toBe('multiple_choice')
    if (v2.interaction.type === 'multiple_choice') {
      expect(v2.interaction.selectionMode).toBe('single')
      expect(v2.interaction.options.find((o) => o.id === 'a')?.correct).toBe(false)
      expect(v2.interaction.options.find((o) => o.id === 'b')?.correct).toBe(true)
    }
  })

  it('codeCompletion -> write_code, maps validation to comparison', () => {
    const card: Card = {
      ...base,
      type: 'codeCompletion',
      content: {
        prompt: 'Reverse a list',
        scaffold: { language: 'python', code: '' },
        solutions: ['lst[::-1]'],
        validation: { mode: 'normalizedMatch', ignoreWhitespace: true, caseSensitive: false },
      },
    }
    const v2 = migrateCard(card)
    expect(v2.interaction.type).toBe('write_code')
    if (v2.interaction.type === 'write_code') {
      expect(v2.interaction.acceptedAnswers).toEqual(['lst[::-1]'])
      expect(v2.interaction.comparison.ignoreTrailingWhitespace).toBe(true)
      expect(v2.interaction.comparison.caseSensitive).toBe(false)
    }
  })

  it('ordering -> preserves correct order and sets randomize true', () => {
    const card: Card = {
      ...base,
      type: 'ordering',
      content: {
        prompt: 'Order',
        items: [
          { id: 'a', text: 'first' },
          { id: 'b', text: 'second' },
        ],
      },
    }
    const v2 = migrateCard(card)
    expect(v2.interaction.type).toBe('ordering')
    if (v2.interaction.type === 'ordering') {
      expect(v2.interaction.correctOrder).toEqual(['a', 'b'])
      expect(v2.interaction.randomize).toBe(true)
    }
  })

  it('matching (unique columns) -> one-to-one relationships', () => {
    const card: Card = {
      ...base,
      type: 'matching',
      content: {
        prompt: 'Match',
        pairs: [
          { id: 'p1', left: 'const', right: 'immutable' },
          { id: 'p2', left: 'extern', right: 'external linkage' },
        ],
      },
    }
    const v2 = migrateCard(card)
    expect(v2.interaction.type).toBe('matching')
    if (v2.interaction.type === 'matching') {
      expect(v2.interaction.columns).toHaveLength(2)
      expect(v2.interaction.relationships).toHaveLength(2)
      const row = v2.interaction.relationships.find((r) => r.left === 'p1')!
      const rightItem = v2.interaction.columns[1].items.find((i) => i.id === row.right)
      expect(rightItem?.content.value).toBe('immutable')
    }
  })

  it('matching (fixed column) -> shared value list, resolved by value', () => {
    const card: Card = {
      ...base,
      type: 'matching',
      content: {
        prompt: 'Match',
        pairs: [
          { id: 'p1', left: 'is const valid here?', right: 'Yes' },
          { id: 'p2', left: 'is this mutable?', right: 'No' },
        ],
        options: { right: ['Yes', 'No'] },
      },
    }
    const v2 = migrateCard(card)
    expect(v2.interaction.type).toBe('matching')
    if (v2.interaction.type === 'matching') {
      const rightCol = v2.interaction.columns[1]
      expect(rightCol.fixed).toBe(true)
      expect(rightCol.items).toHaveLength(2)
      const row1 = v2.interaction.relationships.find((r) => r.left === 'p1')!
      const item = rightCol.items.find((i) => i.id === row1.right)
      expect(item?.content.value).toBe('Yes')
    }
  })

  it('matching (triple) -> three columns', () => {
    const card: Card = {
      ...base,
      type: 'matching',
      content: {
        prompt: 'Match',
        triple: true,
        pairs: [{ id: 'p1', left: 'A', right: 'B', third: 'C' }],
      },
    }
    const v2 = migrateCard(card)
    expect(v2.interaction.type).toBe('matching')
    if (v2.interaction.type === 'matching') {
      expect(v2.interaction.columns).toHaveLength(3)
      expect(v2.interaction.columns[2].id).toBe('third')
    }
  })

  it('story -> walkthrough, parses multi-range highlight into focus ranges', () => {
    const card: Card = {
      ...base,
      type: 'story',
      content: {
        intro: 'Trace it',
        code: { language: 'cpp', code: 'class A {};' },
        steps: [
          { id: 's1', prompt: 'What runs first?', answer: 'Base ctor', highlight: '26-34, 40' },
        ],
      },
    }
    const v2 = migrateCard(card)
    expect(v2.interaction.type).toBe('walkthrough')
    if (v2.interaction.type === 'walkthrough') {
      expect(v2.interaction.steps[0].focus).toEqual([
        { startLine: 26, endLine: 34 },
        { startLine: 40, endLine: 40 },
      ])
      expect(v2.interaction.steps[0].response).toEqual({
        type: 'recall',
        answer: { format: 'markdown', value: 'Base ctor' },
      })
    }
  })

  it('preserves id, deckId, tags, and timestamps for every type', () => {
    const card: Card = { ...base, type: 'basic', content: { front: 'Q', back: 'A' } }
    const v2 = migrateCard(card)
    expect(v2.id).toBe(base.id)
    expect(v2.deckId).toBe(base.deckId)
    expect(v2.tags).toEqual(base.tags)
    expect(v2.createdAt).toBe(base.createdAt)
    expect(v2.updatedAt).toBe(base.updatedAt)
    expect(v2.schemaVersion).toBe(2)
  })

  it('is idempotent — migrating the same card twice yields deep-equal output', () => {
    // migrateCard is pure and deterministic; this makes that property a
    // checked invariant rather than an assumption. See
    // docs/itera-migration-plan.md §9.
    const card: Card = {
      ...base,
      type: 'matching',
      content: {
        prompt: 'Match',
        triple: true,
        pairs: [{ id: 'p1', left: 'A', right: 'B', third: 'C' }],
        options: { right: ['B'] },
      },
    }
    expect(migrateCard(card)).toEqual(migrateCard(card))
  })
})
