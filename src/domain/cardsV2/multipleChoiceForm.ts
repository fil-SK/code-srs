import type { Card } from '@/types'
import type { CardV2, CardV2Record, MultipleChoiceInteraction, RichContent } from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'
import type { SchedulingState } from '@/types/review'
import { newId } from '@/lib/id'
import { migrateCard } from '@/domain/migration/cardMigration'

// The Multiple Choice editor's in-memory form shape. Mirrors recallForm.ts's
// plain-string convention — RichContent wrapping only happens at the
// read/write boundary (preview object, persisted record).
export interface McOptionFormState {
  id: string
  text: string
  correct: boolean
}

export interface MultipleChoiceFormState {
  deckId: string
  prompt: string
  tip: string
  explanation: string
  selectionMode: 'single' | 'multiple'
  randomizeOptions: boolean
  options: McOptionFormState[]
  tags: string // comma-separated, matching the v1 editor's convention
}

export function emptyMultipleChoiceForm(deckId = ''): MultipleChoiceFormState {
  return {
    deckId,
    prompt: '',
    tip: '',
    explanation: '',
    selectionMode: 'single',
    randomizeOptions: false,
    options: [
      { id: newId(), text: '', correct: false },
      { id: newId(), text: '', correct: false },
    ],
    tags: '',
  }
}

function optionalRichText(text: string): RichContent | undefined {
  return text.trim() ? richText(text) : undefined
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

function toMcOptions(options: McOptionFormState[]): MultipleChoiceInteraction['options'] {
  return options.map((o) => ({ id: o.id, content: richText(o.text), correct: o.correct }))
}

// Builds the throwaway object the live-preview pane renders through the real
// ReviewSessionScreen. Never persisted as-is, so timestamps are nominal.
export function multipleChoiceFormToPreviewCard(
  form: MultipleChoiceFormState,
  id: string,
): CardV2 & { interaction: MultipleChoiceInteraction } {
  return {
    id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: {
      type: 'multiple_choice',
      selectionMode: form.selectionMode,
      randomizeOptions: form.randomizeOptions,
      options: toMcOptions(form.options),
    },
    tags: parseTags(form.tags),
    createdAt: 0,
    updatedAt: 0,
  }
}

// The envelope fields the form itself doesn't own: identity, provenance, and
// scheduling. Fresh for a new card; carried over verbatim when editing an
// existing CardV2Record or migrating a legacy v1 card.
export interface MultipleChoiceEnvelope {
  id: string
  createdAt: number
  suspended: boolean
  scheduling: SchedulingState
  order?: number
}

export function multipleChoiceFormToRecord(
  form: MultipleChoiceFormState,
  envelope: MultipleChoiceEnvelope,
  now: number = Date.now(),
): CardV2Record {
  return {
    id: envelope.id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: {
      type: 'multiple_choice',
      selectionMode: form.selectionMode,
      randomizeOptions: form.randomizeOptions,
      options: toMcOptions(form.options),
    },
    tags: parseTags(form.tags),
    createdAt: envelope.createdAt,
    updatedAt: now,
    suspended: envelope.suspended,
    scheduling: envelope.scheduling,
    order: envelope.order,
  }
}

export function cardV2RecordToMultipleChoiceForm(record: CardV2Record): MultipleChoiceFormState {
  if (record.interaction.type !== 'multiple_choice') {
    throw new Error(`CardV2Record ${record.id} is not a Multiple Choice interaction`)
  }
  return {
    deckId: record.deckId,
    prompt: record.prompt.value,
    tip: record.tip?.value ?? '',
    explanation: record.explanation?.value ?? '',
    selectionMode: record.interaction.selectionMode,
    randomizeOptions: record.interaction.randomizeOptions,
    options: record.interaction.options.map((o) => ({
      id: o.id,
      text: o.content.value,
      correct: o.correct,
    })),
    tags: record.tags.join(', '),
  }
}

// Hydrates the form from a legacy v1 'mcq' card via the existing lazy
// migrator — mirrors recallForm.ts's legacyCardToForm.
export function legacyMcqCardToForm(card: Card): MultipleChoiceFormState {
  const v2 = migrateCard(card)
  if (v2.interaction.type !== 'multiple_choice') {
    throw new Error(`Card ${card.id} (type '${card.type}') is not Multiple-Choice-shaped`)
  }
  return {
    deckId: v2.deckId,
    prompt: v2.prompt.value,
    tip: v2.tip?.value ?? '',
    explanation: v2.explanation?.value ?? '',
    selectionMode: v2.interaction.selectionMode,
    randomizeOptions: v2.interaction.randomizeOptions,
    options: v2.interaction.options.map((o) => ({
      id: o.id,
      text: o.content.value,
      correct: o.correct,
    })),
    tags: v2.tags.join(', '),
  }
}

export interface MultipleChoiceValidation {
  canSave: boolean
  errors: string[]
}

// Pure validation shared by the editor's Save gating and its inline error
// list: enough options to be a valid card, every option filled in, at least
// one correct answer, and single-select can't have more than one.
export function validateMultipleChoiceForm(form: MultipleChoiceFormState): MultipleChoiceValidation {
  const errors: string[] = []

  if (form.prompt.trim().length === 0) errors.push('Prompt is required.')
  if (form.options.length < 2) errors.push('Add at least 2 options.')
  if (form.options.some((o) => o.text.trim().length === 0)) errors.push('All options need text.')

  const correctCount = form.options.filter((o) => o.correct).length
  if (correctCount === 0) errors.push('Mark at least one option as correct.')
  if (form.selectionMode === 'single' && correctCount > 1) {
    errors.push('Single-select cards can only have one correct option.')
  }

  return { canSave: errors.length === 0, errors }
}
