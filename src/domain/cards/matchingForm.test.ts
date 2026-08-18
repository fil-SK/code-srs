import { describe, expect, it } from 'vitest'
import type { Card } from '@/types/card'
import {
  MAX_MATCHING_VALUE_COLUMNS,
  addMatchingColumn,
  addMatchingOption,
  addMatchingRow,
  cardRecordToMatchingForm,
  emptyMatchingForm,
  matchingFormToPreviewCard,
  matchingFormToRecord,
  moveMatchingRow,
  removeMatchingColumn,
  removeMatchingOption,
  removeMatchingRow,
  renameMatchingOption,
  setColumnFixed,
  updateMatchingColumnLabel,
  updateMatchingRowCell,
  updateMatchingRowSource,
  validateMatchingForm,
  type MatchingFormState,
} from './matchingForm'

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

const twoColumn: MatchingFormState = {
  deckId: 'deck-1',
  prompt: 'Match each term to its definition.',
  tip: 'Think about memory layout.',
  explanation: 'These are core C++ memory concepts.',
  sourceColumnId: 'source',
  sourceLabel: 'Term',
  columns: [{ id: 'target', label: 'Definition', fixed: false, options: [] }],
  rows: [
    { id: 'row-a', source: 'Stack', cells: { target: 'LIFO frames' } },
    { id: 'row-b', source: 'Heap', cells: { target: 'Manually managed' } },
  ],
  tags: 'cpp, memory, memory',
}

describe('emptyMatchingForm', () => {
  it('starts blank with one column, three empty rows, and stable ids', () => {
    const f = emptyMatchingForm('deck-2')
    expect(f.deckId).toBe('deck-2')
    expect(f.sourceColumnId).toBe('source')
    expect(f.columns).toHaveLength(1)
    expect(f.columns[0].fixed).toBe(false)
    expect(f.rows).toHaveLength(3)
    const rowIds = f.rows.map((r) => r.id)
    const colIds = f.columns.map((c) => c.id)
    expect(new Set([...rowIds, ...colIds]).size).toBe(rowIds.length + colIds.length)
    expect(f.rows.every((r) => r.source === '')).toBe(true)
  })
})

describe('matchingFormToPreviewCard - two column', () => {
  it('builds a Card with source + one other column, ids derived from rows/columns', () => {
    const card = matchingFormToPreviewCard(twoColumn, 'preview-id')
    expect(card.id).toBe('preview-id')
    expect(card.prompt).toEqual({ format: 'markdown', value: twoColumn.prompt })
    expect(card.interaction).toEqual({
      type: 'matching',
      columns: [
        {
          id: 'source',
          label: 'Term',
          fixed: false,
          items: [
            { id: 'row-a', content: { format: 'markdown', value: 'Stack' } },
            { id: 'row-b', content: { format: 'markdown', value: 'Heap' } },
          ],
        },
        {
          id: 'target',
          label: 'Definition',
          fixed: false,
          items: [
            { id: 'row-a:target', content: { format: 'markdown', value: 'LIFO frames' } },
            { id: 'row-b:target', content: { format: 'markdown', value: 'Manually managed' } },
          ],
        },
      ],
      relationships: [
        { source: 'row-a', target: 'row-a:target' },
        { source: 'row-b', target: 'row-b:target' },
      ],
    })
    expect(card.tags).toEqual(['cpp', 'memory']) // deduped
  })

  it('omits tip/explanation when blank', () => {
    const card = matchingFormToPreviewCard({ ...twoColumn, tip: '  ', explanation: '' }, 'x')
    expect(card.tip).toBeUndefined()
    expect(card.explanation).toBeUndefined()
  })
})

describe('matchingFormToPreviewCard - three column', () => {
  const threeColumn: MatchingFormState = {
    ...twoColumn,
    columns: [
      { id: 'target', label: 'Definition', fixed: false, options: [] },
      { id: 'third', label: 'Category', fixed: false, options: [] },
    ],
    rows: [
      { id: 'row-a', source: 'Stack', cells: { target: 'LIFO frames', third: 'Memory' } },
      { id: 'row-b', source: 'Heap', cells: { target: 'Manually managed', third: 'Memory' } },
    ],
  }

  it('grades both non-source columns independently, each with its own synthesized ids', () => {
    const card = matchingFormToPreviewCard(threeColumn, 'x')
    expect(card.interaction.columns).toHaveLength(3)
    expect(card.interaction.relationships).toEqual([
      { source: 'row-a', target: 'row-a:target', third: 'row-a:third' },
      { source: 'row-b', target: 'row-b:target', third: 'row-b:third' },
    ])
  })
})

describe('matchingFormToPreviewCard - fixed column', () => {
  const fixed: MatchingFormState = {
    ...twoColumn,
    columns: [
      {
        id: 'verdict',
        label: 'Verdict',
        fixed: true,
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' },
        ],
      },
    ],
    rows: [
      { id: 'row-a', source: 'Stack', cells: { verdict: 'yes' } },
      { id: 'row-b', source: 'Heap', cells: { verdict: 'no' } },
    ],
  }

  it('preserves fixed-column option ids verbatim (shared value list, not per-row synthesis)', () => {
    const card = matchingFormToPreviewCard(fixed, 'x')
    expect(card.interaction.columns[1]).toEqual({
      id: 'verdict',
      label: 'Verdict',
      fixed: true,
      items: [
        { id: 'yes', content: { format: 'markdown', value: 'Yes' } },
        { id: 'no', content: { format: 'markdown', value: 'No' } },
      ],
    })
    expect(card.interaction.relationships).toEqual([
      { source: 'row-a', verdict: 'yes' },
      { source: 'row-b', verdict: 'no' },
    ])
  })
})

describe('matchingFormToRecord', () => {
  it('carries the envelope through and stamps updatedAt', () => {
    const record = matchingFormToRecord(
      twoColumn,
      { id: 'card-1', createdAt: 500, suspended: true, scheduling, order: 3 },
      9000,
    )
    expect(record.id).toBe('card-1')
    expect(record.createdAt).toBe(500)
    expect(record.updatedAt).toBe(9000)
    expect(record.suspended).toBe(true)
    expect(record.scheduling).toEqual(scheduling)
    expect(record.order).toBe(3)
    expect(record.interaction.type).toBe('matching')
  })
})

describe('cardRecordToMatchingForm round-trip', () => {
  const record: Card = {
    id: 'card-1',
    schemaVersion: 2,
    deckId: 'deck-1',
    prompt: { format: 'markdown', value: 'Match each term to its definition.' },
    tip: { format: 'markdown', value: 'hint' },
    explanation: { format: 'markdown', value: 'why' },
    interaction: {
      type: 'matching',
      columns: [
        {
          id: 'source',
          label: 'Term',
          fixed: false,
          items: [
            { id: 's1', content: { format: 'markdown', value: 'Stack' } },
            { id: 's2', content: { format: 'markdown', value: 'Heap' } },
          ],
        },
        {
          id: 'verdict',
          label: 'Verdict',
          fixed: true,
          items: [
            { id: 'yes', content: { format: 'markdown', value: 'Yes' } },
            { id: 'no', content: { format: 'markdown', value: 'No' } },
          ],
        },
      ],
      relationships: [
        { source: 's1', verdict: 'yes' },
        { source: 's2', verdict: 'no' },
      ],
    },
    tags: ['x', 'y'],
    createdAt: 1,
    updatedAt: 2,
    suspended: false,
    scheduling,
  }

  it('round-trips a Card back into form state', () => {
    const form = cardRecordToMatchingForm(record)
    expect(form.deckId).toBe('deck-1')
    expect(form.sourceColumnId).toBe('source')
    expect(form.sourceLabel).toBe('Term')
    expect(form.rows).toEqual([
      { id: 's1', source: 'Stack', cells: { verdict: 'yes' } },
      { id: 's2', source: 'Heap', cells: { verdict: 'no' } },
    ])
    expect(form.columns).toEqual([
      {
        id: 'verdict',
        label: 'Verdict',
        fixed: true,
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' },
        ],
      },
    ])
    expect(form.tags).toBe('x, y')
  })

  it('formToRecord(recordToForm(record)) reproduces the same interaction shape', () => {
    const roundTripped = matchingFormToRecord(
      cardRecordToMatchingForm(record),
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

  it('throws for a Card that is not Matching-shaped', () => {
    const recallRecord: Card = {
      ...record,
      interaction: { type: 'recall', answer: { format: 'markdown', value: 'A' } },
    }
    expect(() => cardRecordToMatchingForm(recallRecord)).toThrow()
  })
})


describe('validateMatchingForm', () => {
  it('passes for a well-formed two-column form', () => {
    expect(validateMatchingForm(twoColumn)).toEqual({ canSave: true, errors: [] })
  })

  it('requires a prompt', () => {
    const result = validateMatchingForm({ ...twoColumn, prompt: '  ' })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Prompt is required.')
  })

  it('requires at least 1 other column', () => {
    const result = validateMatchingForm({ ...twoColumn, columns: [] })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Add at least one more column.')
  })

  it('rejects more than 3 columns, so data that predates the cap can’t be saved past it', () => {
    const fourColumn = {
      ...twoColumn,
      columns: [
        ...twoColumn.columns,
        { id: 'third', label: 'Third', fixed: false, options: [] },
        { id: 'fourth', label: 'Fourth', fixed: false, options: [] },
      ],
      rows: twoColumn.rows.map((r) => ({ ...r, cells: { ...r.cells, third: 'x', fourth: 'y' } })),
    }
    const result = validateMatchingForm(fourColumn)
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('A Matching card supports at most 3 columns.')
  })

  it('requires at least 2 rows', () => {
    const result = validateMatchingForm({ ...twoColumn, rows: [twoColumn.rows[0]] })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Add at least 2 rows.')
  })

  it('requires every row to have source text', () => {
    const result = validateMatchingForm({
      ...twoColumn,
      rows: [twoColumn.rows[0], { ...twoColumn.rows[1], source: '  ' }],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors.some((e) => e.includes('Term'))).toBe(true)
  })

  it('requires unique source text across rows', () => {
    const result = validateMatchingForm({
      ...twoColumn,
      rows: [twoColumn.rows[0], { ...twoColumn.rows[1], source: 'Stack' }],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Give each row unique text in Term.')
  })

  it('requires every row to have a value in a non-fixed column', () => {
    const result = validateMatchingForm({
      ...twoColumn,
      rows: [twoColumn.rows[0], { ...twoColumn.rows[1], cells: { target: '' } }],
    })
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Every row needs a value in "Definition".')
  })

  it('requires a fixed column to have at least 2 options', () => {
    const fixed: MatchingFormState = {
      ...twoColumn,
      columns: [{ id: 'verdict', label: 'Verdict', fixed: true, options: [{ id: 'yes', text: 'Yes' }] }],
      rows: [
        { id: 'row-a', source: 'Stack', cells: { verdict: 'yes' } },
        { id: 'row-b', source: 'Heap', cells: { verdict: 'yes' } },
      ],
    }
    const result = validateMatchingForm(fixed)
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('"Verdict" needs at least 2 options.')
  })

  it('requires fixed-column options to be unique', () => {
    const fixed: MatchingFormState = {
      ...twoColumn,
      columns: [
        {
          id: 'verdict',
          label: 'Verdict',
          fixed: true,
          options: [
            { id: 'yes', text: 'Yes' },
            { id: 'yes2', text: 'Yes' },
          ],
        },
      ],
      rows: [
        { id: 'row-a', source: 'Stack', cells: { verdict: 'yes' } },
        { id: 'row-b', source: 'Heap', cells: { verdict: 'yes2' } },
      ],
    }
    const result = validateMatchingForm(fixed)
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Options in "Verdict" must be unique.')
  })

  it('requires every row to have a real option chosen in a fixed column', () => {
    const fixed: MatchingFormState = {
      ...twoColumn,
      columns: [
        {
          id: 'verdict',
          label: 'Verdict',
          fixed: true,
          options: [
            { id: 'yes', text: 'Yes' },
            { id: 'no', text: 'No' },
          ],
        },
      ],
      rows: [
        { id: 'row-a', source: 'Stack', cells: { verdict: 'yes' } },
        { id: 'row-b', source: 'Heap', cells: {} },
      ],
    }
    const result = validateMatchingForm(fixed)
    expect(result.canSave).toBe(false)
    expect(result.errors).toContain('Every row needs an option chosen in "Verdict".')
  })
})

describe('pure mutation helpers', () => {
  it('addMatchingRow/removeMatchingRow/moveMatchingRow preserve stable ids and each row own cells', () => {
    let form = addMatchingRow(twoColumn)
    expect(form.rows).toHaveLength(3)
    const newRowId = form.rows[2].id
    expect(newRowId).not.toBe('row-a')
    expect(newRowId).not.toBe('row-b')

    form = moveMatchingRow(form, newRowId, -1)
    expect(form.rows.map((r) => r.id)).toEqual(['row-a', newRowId, 'row-b'])
    // relationships stay correct by id after reorder
    const card = matchingFormToPreviewCard(form, 'x')
    expect(card.interaction.relationships.map((r) => r.source)).toEqual([
      'row-a',
      newRowId,
      'row-b',
    ])
    expect(card.interaction.relationships.find((r) => r.source === 'row-b')?.target).toBe(
      'row-b:target',
    )

    form = removeMatchingRow(form, newRowId)
    expect(form.rows.map((r) => r.id)).toEqual(['row-a', 'row-b'])
  })

  it('moveMatchingRow is a no-op past the boundaries', () => {
    expect(moveMatchingRow(twoColumn, 'row-a', -1)).toBe(twoColumn)
    expect(moveMatchingRow(twoColumn, 'row-b', 1)).toBe(twoColumn)
  })

  it('removeMatchingColumn cascades: strips the column key from every row, no dangling cells', () => {
    const withThird = addMatchingColumn(twoColumn)
    const thirdId = withThird.columns[1].id
    const withValue = updateMatchingRowCell(withThird, 'row-a', thirdId, 'x')
    expect(withValue.rows[0].cells[thirdId]).toBe('x')

    const removed = removeMatchingColumn(withValue, thirdId)
    expect(removed.columns).toHaveLength(1)
    expect(removed.rows.every((r) => !(thirdId in r.cells))).toBe(true)
  })

  it('relationships are preserved when a column is removed and a fresh one added (not resurrected)', () => {
    const withThird = addMatchingColumn(twoColumn)
    const thirdId = withThird.columns[1].id
    const removed = removeMatchingColumn(withThird, thirdId)
    const readded = addMatchingColumn(removed)
    expect(readded.columns[1].id).not.toBe(thirdId)
    expect(readded.columns).toHaveLength(2)
  })

  it('addMatchingColumn stops at the 3-column cap (2 value columns), returning the form untouched', () => {
    const withThird = addMatchingColumn(twoColumn)
    expect(withThird.columns).toHaveLength(MAX_MATCHING_VALUE_COLUMNS)

    const capped = addMatchingColumn(withThird)
    expect(capped).toBe(withThird)
  })

  it('setColumnFixed(true) seeds 2 blank options and resets every row cell for that column', () => {
    const fixed = setColumnFixed(twoColumn, 'target', true)
    const col = fixed.columns.find((c) => c.id === 'target')!
    expect(col.fixed).toBe(true)
    expect(col.options).toHaveLength(2)
    expect(fixed.rows.every((r) => r.cells.target === '')).toBe(true)
  })

  it('setColumnFixed(false) clears options and resets cells so an option id is never misread as free text', () => {
    const fixed = setColumnFixed(twoColumn, 'target', true)
    const withChoice = updateMatchingRowCell(fixed, 'row-a', 'target', fixed.columns[0].options[0].id)
    const unfixed = setColumnFixed(withChoice, 'target', false)
    const col = unfixed.columns.find((c) => c.id === 'target')!
    expect(col.fixed).toBe(false)
    expect(col.options).toEqual([])
    expect(unfixed.rows.every((r) => r.cells.target === '')).toBe(true)
  })

  it('removeMatchingOption cascades: any row referencing the removed option resets to empty', () => {
    const fixed = setColumnFixed(twoColumn, 'target', true)
    const yesId = fixed.columns[0].options[0].id
    const withChoice = updateMatchingRowCell(fixed, 'row-a', 'target', yesId)
    const removed = removeMatchingOption(withChoice, 'target', yesId)
    expect(removed.columns[0].options.find((o) => o.id === yesId)).toBeUndefined()
    expect(removed.rows.find((r) => r.id === 'row-a')?.cells.target).toBe('')
  })

  it('addMatchingOption/renameMatchingOption edit a fixed column option list', () => {
    const fixed = setColumnFixed(twoColumn, 'target', true)
    const withNew = addMatchingOption(fixed, 'target')
    expect(withNew.columns[0].options).toHaveLength(3)
    const newOptionId = withNew.columns[0].options[2].id
    const renamed = renameMatchingOption(withNew, 'target', newOptionId, 'Maybe')
    expect(renamed.columns[0].options[2].text).toBe('Maybe')
  })

  it('updateMatchingRowSource/updateMatchingColumnLabel edit in place without touching other rows/columns', () => {
    const updated = updateMatchingRowSource(twoColumn, 'row-a', 'Register')
    expect(updated.rows[0].source).toBe('Register')
    expect(updated.rows[1].source).toBe('Heap')

    const relabeled = updateMatchingColumnLabel(twoColumn, 'target', 'Meaning')
    expect(relabeled.columns[0].label).toBe('Meaning')
  })
})
