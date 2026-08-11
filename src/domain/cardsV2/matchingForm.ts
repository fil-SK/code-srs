import type { Card } from '@/types'
import type {
  CardV2,
  CardV2Record,
  MatchingColumn,
  MatchingInteraction,
  RichContent,
} from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'
import type { SchedulingState } from '@/types/review'
import { newId } from '@/lib/id'
import { migrateCard } from '@/domain/migration/cardMigration'

// The Matching editor's in-memory form shape. The source column is not one of
// form.columns — it's a distinguished field, because gradeMatching/MatchingView
// always destructure [sourceCol, ...otherCols] and the source column is never
// `fixed`. Only "other" columns vary in count/fixedness, so only they need a
// list. A row's cell value is EITHER free text (column.fixed === false) OR the
// id of one of that column's shared options (column.fixed === true) — which
// interpretation applies is determined by looking up the column, mirroring a
// <select>'s value vs an <input>'s value. This dual meaning is intentional,
// not an omission.
export interface MatchingOptionFormState {
  id: string
  text: string
}

export interface MatchingColumnFormState {
  id: string
  label: string
  fixed: boolean
  options: MatchingOptionFormState[] // meaningful only when fixed; [] otherwise
}

export interface MatchingRowFormState {
  id: string
  source: string
  cells: Record<string, string>
}

// A Matching card is capped at three columns total: the term column plus at
// most two value columns. The board (MatchingBoard.tsx) draws a relationship
// as a chain of hops across the gutters, and past three columns that becomes
// both unreadable and too narrow to hold real text at the card's width. Three
// is also exactly what the richest existing content needs — a legacy v1
// `triple` matching card migrates to three columns — so no authored card is
// left un-editable by the cap.
export const MAX_MATCHING_VALUE_COLUMNS = 2

export interface MatchingFormState {
  deckId: string
  prompt: string
  tip: string
  explanation: string
  sourceColumnId: string
  sourceLabel: string
  columns: MatchingColumnFormState[] // "other" columns, always length >= 1
  rows: MatchingRowFormState[]
  tags: string // comma-separated, matching the v1 editor's convention
}

export function emptyMatchingForm(deckId = ''): MatchingFormState {
  return {
    deckId,
    prompt: '',
    tip: '',
    explanation: '',
    sourceColumnId: 'source',
    sourceLabel: '',
    columns: [{ id: newId(), label: '', fixed: false, options: [] }],
    rows: [
      { id: newId(), source: '', cells: {} },
      { id: newId(), source: '', cells: {} },
      { id: newId(), source: '', cells: {} },
    ],
    tags: '',
  }
}

function optionalRichText(text: string): RichContent | undefined {
  return text.trim() ? richText(text) : undefined
}

function optionalLabel(text: string): string | undefined {
  return text.trim() ? text : undefined
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  )
}

// Reuses the exact `${rowId}:${columnId}` synthetic-id convention
// migrateMatching (src/domain/migration/cardMigration.ts) already uses for
// unique columns — not a coincidence: it's what makes round-tripping a
// migrated legacy card lossless (see legacyMatchingCardToForm below).
function uniqueItemId(rowId: string, columnId: string): string {
  return `${rowId}:${columnId}`
}

function toMatchingInteraction(form: MatchingFormState): MatchingInteraction {
  const sourceColumn: MatchingColumn = {
    id: form.sourceColumnId,
    label: optionalLabel(form.sourceLabel),
    fixed: false,
    items: form.rows.map((r) => ({ id: r.id, content: richText(r.source) })),
  }

  const otherColumns: MatchingColumn[] = form.columns.map((col) =>
    col.fixed
      ? {
          id: col.id,
          label: optionalLabel(col.label),
          fixed: true,
          items: col.options.map((o) => ({ id: o.id, content: richText(o.text) })),
        }
      : {
          id: col.id,
          label: optionalLabel(col.label),
          fixed: false,
          items: form.rows.map((r) => ({
            id: uniqueItemId(r.id, col.id),
            content: richText(r.cells[col.id] ?? ''),
          })),
        },
  )

  const relationships = form.rows.map((r) => {
    const row: Record<string, string> = { [form.sourceColumnId]: r.id }
    for (const col of form.columns) {
      row[col.id] = col.fixed ? (r.cells[col.id] ?? '') : uniqueItemId(r.id, col.id)
    }
    return row
  })

  return { type: 'matching', columns: [sourceColumn, ...otherColumns], relationships }
}

// Builds the throwaway object the live-preview pane renders through the real
// ReviewSessionScreen. Never persisted as-is, so timestamps are nominal.
export function matchingFormToPreviewCard(
  form: MatchingFormState,
  id: string,
): CardV2 & { interaction: MatchingInteraction } {
  return {
    id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: toMatchingInteraction(form),
    tags: parseTags(form.tags),
    createdAt: 0,
    updatedAt: 0,
  }
}

// The envelope fields the form itself doesn't own: identity, provenance, and
// scheduling. Fresh for a new card; carried over verbatim when editing an
// existing CardV2Record or migrating a legacy v1 card.
export interface MatchingEnvelope {
  id: string
  createdAt: number
  suspended: boolean
  scheduling: SchedulingState
  order?: number
}

export function matchingFormToRecord(
  form: MatchingFormState,
  envelope: MatchingEnvelope,
  now: number = Date.now(),
): CardV2Record {
  return {
    id: envelope.id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: toMatchingInteraction(form),
    tags: parseTags(form.tags),
    createdAt: envelope.createdAt,
    updatedAt: now,
    suspended: envelope.suspended,
    scheduling: envelope.scheduling,
    order: envelope.order,
  }
}

// Reconstructs form state by id lookup against `relationships` — never by
// parsing synthetic id strings, so this is robust regardless of exactly how
// unique-column ids were generated (self-authored or migrated).
function matchingInteractionToForm(interaction: MatchingInteraction): {
  sourceColumnId: string
  sourceLabel: string
  columns: MatchingColumnFormState[]
  rows: MatchingRowFormState[]
} {
  const [sourceCol, ...otherCols] = interaction.columns
  const rows: MatchingRowFormState[] = interaction.relationships.map((relRow) => {
    const rowId = relRow[sourceCol.id]
    const sourceItem = sourceCol.items.find((i) => i.id === rowId)
    const cells: Record<string, string> = {}
    for (const col of otherCols) {
      const itemId = relRow[col.id]
      cells[col.id] = col.fixed
        ? (itemId ?? '')
        : (col.items.find((i) => i.id === itemId)?.content.value ?? '')
    }
    return { id: rowId, source: sourceItem?.content.value ?? '', cells }
  })

  const columns: MatchingColumnFormState[] = otherCols.map((col) => ({
    id: col.id,
    label: col.label ?? '',
    fixed: Boolean(col.fixed),
    options: col.fixed ? col.items.map((i) => ({ id: i.id, text: i.content.value })) : [],
  }))

  return { sourceColumnId: sourceCol.id, sourceLabel: sourceCol.label ?? '', columns, rows }
}

export function cardV2RecordToMatchingForm(record: CardV2Record): MatchingFormState {
  if (record.interaction.type !== 'matching') {
    throw new Error(`CardV2Record ${record.id} is not a Matching interaction`)
  }
  const { sourceColumnId, sourceLabel, columns, rows } = matchingInteractionToForm(
    record.interaction,
  )
  return {
    deckId: record.deckId,
    prompt: record.prompt.value,
    tip: record.tip?.value ?? '',
    explanation: record.explanation?.value ?? '',
    sourceColumnId,
    sourceLabel,
    columns,
    rows,
    tags: record.tags.join(', '),
  }
}

// Hydrates the form from a legacy v1 'matching' card via the existing lazy
// migrator — mirrors legacyOrderingCardToForm. migrateMatching's unique-column
// ids already follow `${pairId}:${colId}`, matching this file's own
// uniqueItemId convention, so the round-trip stays lossless.
export function legacyMatchingCardToForm(card: Card): MatchingFormState {
  const v2 = migrateCard(card)
  if (v2.interaction.type !== 'matching') {
    throw new Error(`Card ${card.id} (type '${card.type}') is not Matching-shaped`)
  }
  const { sourceColumnId, sourceLabel, columns, rows } = matchingInteractionToForm(
    v2.interaction,
  )
  return {
    deckId: v2.deckId,
    prompt: v2.prompt.value,
    tip: v2.tip?.value ?? '',
    explanation: v2.explanation?.value ?? '',
    sourceColumnId,
    sourceLabel,
    columns,
    rows,
    tags: v2.tags.join(', '),
  }
}

export interface MatchingValidation {
  canSave: boolean
  errors: string[]
}

function trimmedDuplicates(values: string[]): boolean {
  const seen = new Set<string>()
  for (const raw of values) {
    const v = raw.trim()
    if (!v) continue
    if (seen.has(v)) return true
    seen.add(v)
  }
  return false
}

// Pure validation shared by the editor's Save gating and its inline error
// list: enough columns/rows to form a meaningful relationship set, every
// required cell filled, fixed columns have a real (non-duplicate) option
// list, and no ambiguous duplicate values anywhere correctness depends on
// uniqueness.
export function validateMatchingForm(form: MatchingFormState): MatchingValidation {
  const errors: string[] = []

  if (form.prompt.trim().length === 0) errors.push('Prompt is required.')
  if (form.columns.length < 1) errors.push('Add at least one more column.')
  if (form.columns.length > MAX_MATCHING_VALUE_COLUMNS) {
    errors.push(`A Matching card supports at most ${MAX_MATCHING_VALUE_COLUMNS + 1} columns.`)
  }
  if (form.rows.length < 2) errors.push('Add at least 2 rows.')

  const sourceLabel = form.sourceLabel.trim() || 'the source column'
  if (form.rows.some((r) => r.source.trim().length === 0)) {
    errors.push(`All rows need ${sourceLabel} text.`)
  }
  if (trimmedDuplicates(form.rows.map((r) => r.source))) {
    errors.push(`Give each row unique text in ${sourceLabel}.`)
  }

  for (const col of form.columns) {
    const label = col.label.trim() || 'a column'
    if (col.fixed) {
      if (col.options.length < 2) errors.push(`"${label}" needs at least 2 options.`)
      if (col.options.some((o) => o.text.trim().length === 0)) {
        errors.push(`Options in "${label}" can't be blank.`)
      }
      if (trimmedDuplicates(col.options.map((o) => o.text))) {
        errors.push(`Options in "${label}" must be unique.`)
      }
      const optionIds = new Set(col.options.map((o) => o.id))
      if (form.rows.some((r) => !optionIds.has(r.cells[col.id] ?? ''))) {
        errors.push(`Every row needs an option chosen in "${label}".`)
      }
    } else {
      if (form.rows.some((r) => (r.cells[col.id] ?? '').trim().length === 0)) {
        errors.push(`Every row needs a value in "${label}".`)
      }
      if (trimmedDuplicates(form.rows.map((r) => r.cells[col.id] ?? ''))) {
        errors.push(`Give each row a unique value in "${label}".`)
      }
    }
  }

  return { canSave: errors.length === 0, errors }
}

// ---- Pure mutation helpers ----
// Exported (rather than inlined as closures in MatchingFields.tsx, unlike
// Ordering/MC's local set()/addItem() convention) because the cascade-cleanup
// invariants here are exactly what needs direct unit testing: removing a
// column must strip it from every row's cells, and removing/toggling a fixed
// option must never leave a row referencing a value that no longer exists.

export function updateMatchingRowSource(
  form: MatchingFormState,
  rowId: string,
  source: string,
): MatchingFormState {
  return { ...form, rows: form.rows.map((r) => (r.id === rowId ? { ...r, source } : r)) }
}

export function updateMatchingRowCell(
  form: MatchingFormState,
  rowId: string,
  columnId: string,
  value: string,
): MatchingFormState {
  return {
    ...form,
    rows: form.rows.map((r) =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: value } } : r,
    ),
  }
}

export function updateMatchingColumnLabel(
  form: MatchingFormState,
  columnId: string,
  label: string,
): MatchingFormState {
  return {
    ...form,
    columns: form.columns.map((c) => (c.id === columnId ? { ...c, label } : c)),
  }
}

export function addMatchingRow(form: MatchingFormState): MatchingFormState {
  return { ...form, rows: [...form.rows, { id: newId(), source: '', cells: {} }] }
}

export function removeMatchingRow(form: MatchingFormState, rowId: string): MatchingFormState {
  return { ...form, rows: form.rows.filter((r) => r.id !== rowId) }
}

export function moveMatchingRow(
  form: MatchingFormState,
  rowId: string,
  direction: -1 | 1,
): MatchingFormState {
  const index = form.rows.findIndex((r) => r.id === rowId)
  const target = index + direction
  if (index === -1 || target < 0 || target >= form.rows.length) return form
  const rows = [...form.rows]
  ;[rows[index], rows[target]] = [rows[target], rows[index]]
  return { ...form, rows }
}

export function addMatchingColumn(form: MatchingFormState): MatchingFormState {
  if (form.columns.length >= MAX_MATCHING_VALUE_COLUMNS) return form
  return {
    ...form,
    columns: [...form.columns, { id: newId(), label: '', fixed: false, options: [] }],
  }
}

export function removeMatchingColumn(
  form: MatchingFormState,
  columnId: string,
): MatchingFormState {
  return {
    ...form,
    columns: form.columns.filter((c) => c.id !== columnId),
    rows: form.rows.map((r) => {
      const { [columnId]: _removed, ...rest } = r.cells
      return { ...r, cells: rest }
    }),
  }
}

// An option id and free text must never be misread as each other, so
// toggling `fixed` in either direction resets that column's cells on every
// row rather than trying to reinterpret the existing value.
export function setColumnFixed(
  form: MatchingFormState,
  columnId: string,
  fixed: boolean,
): MatchingFormState {
  return {
    ...form,
    columns: form.columns.map((c) =>
      c.id === columnId
        ? {
            ...c,
            fixed,
            options: fixed
              ? [
                  { id: newId(), text: '' },
                  { id: newId(), text: '' },
                ]
              : [],
          }
        : c,
    ),
    rows: form.rows.map((r) => ({ ...r, cells: { ...r.cells, [columnId]: '' } })),
  }
}

export function addMatchingOption(form: MatchingFormState, columnId: string): MatchingFormState {
  return {
    ...form,
    columns: form.columns.map((c) =>
      c.id === columnId ? { ...c, options: [...c.options, { id: newId(), text: '' }] } : c,
    ),
  }
}

// Cascades: any row referencing the removed option resets to '' so nothing
// dangles.
export function removeMatchingOption(
  form: MatchingFormState,
  columnId: string,
  optionId: string,
): MatchingFormState {
  return {
    ...form,
    columns: form.columns.map((c) =>
      c.id === columnId ? { ...c, options: c.options.filter((o) => o.id !== optionId) } : c,
    ),
    rows: form.rows.map((r) =>
      r.cells[columnId] === optionId ? { ...r, cells: { ...r.cells, [columnId]: '' } } : r,
    ),
  }
}

export function renameMatchingOption(
  form: MatchingFormState,
  columnId: string,
  optionId: string,
  text: string,
): MatchingFormState {
  return {
    ...form,
    columns: form.columns.map((c) =>
      c.id === columnId
        ? { ...c, options: c.options.map((o) => (o.id === optionId ? { ...o, text } : o)) }
        : c,
    ),
  }
}
