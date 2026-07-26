import type { Card } from '@/types'
import type { CardV2, CardV2Record, RichContent, WriteCodeInteraction } from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'
import type { SchedulingState } from '@/types/review'
import { newId } from '@/lib/id'
import { migrateCard } from '@/domain/migration/cardMigration'

// The Write Code editor's in-memory form shape. Mirrors multipleChoiceForm.ts's
// plain-string convention — RichContent wrapping only happens at the
// read/write boundary (preview object, persisted record). Accepted answers
// carry a form-only `id` (not persisted, WriteCodeInteraction.acceptedAnswers
// is a plain string[]) purely so the list UI can key rows stably across
// reorder/remove, the same reason McOptionFormState carries one.
export interface WriteCodeAnswerFormState {
  id: string
  code: string
}

export interface WriteCodeFormState {
  deckId: string
  prompt: string
  tip: string
  explanation: string
  language: string
  starterCode: string
  acceptedAnswers: WriteCodeAnswerFormState[]
  comparison: {
    trimOuterWhitespace: boolean
    normalizeLineEndings: boolean
    ignoreTrailingWhitespace: boolean
    caseSensitive: boolean
  }
  tags: string // comma-separated, matching the v1 editor's convention
}

export function emptyWriteCodeForm(deckId = ''): WriteCodeFormState {
  return {
    deckId,
    prompt: '',
    tip: '',
    explanation: '',
    language: 'cpp',
    starterCode: '',
    acceptedAnswers: [{ id: newId(), code: '' }],
    comparison: {
      trimOuterWhitespace: true,
      normalizeLineEndings: true,
      ignoreTrailingWhitespace: true,
      caseSensitive: true,
    },
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

function toAcceptedAnswers(answers: WriteCodeAnswerFormState[]): string[] {
  return answers.map((a) => a.code)
}

// Builds the throwaway object the live-preview pane renders through the real
// ReviewSessionScreen. Never persisted as-is, so timestamps are nominal.
export function writeCodeFormToPreviewCard(
  form: WriteCodeFormState,
  id: string,
): CardV2 & { interaction: WriteCodeInteraction } {
  return {
    id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: {
      type: 'write_code',
      language: form.language,
      starterCode: form.starterCode,
      acceptedAnswers: toAcceptedAnswers(form.acceptedAnswers),
      comparison: { ...form.comparison },
    },
    tags: parseTags(form.tags),
    createdAt: 0,
    updatedAt: 0,
  }
}

// The envelope fields the form itself doesn't own: identity, provenance, and
// scheduling. Fresh for a new card; carried over verbatim when editing an
// existing CardV2Record or migrating a legacy v1 card.
export interface WriteCodeEnvelope {
  id: string
  createdAt: number
  suspended: boolean
  scheduling: SchedulingState
  order?: number
}

export function writeCodeFormToRecord(
  form: WriteCodeFormState,
  envelope: WriteCodeEnvelope,
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
      type: 'write_code',
      language: form.language,
      starterCode: form.starterCode,
      acceptedAnswers: toAcceptedAnswers(form.acceptedAnswers),
      comparison: { ...form.comparison },
    },
    tags: parseTags(form.tags),
    createdAt: envelope.createdAt,
    updatedAt: now,
    suspended: envelope.suspended,
    scheduling: envelope.scheduling,
    order: envelope.order,
  }
}

export function cardV2RecordToWriteCodeForm(record: CardV2Record): WriteCodeFormState {
  if (record.interaction.type !== 'write_code') {
    throw new Error(`CardV2Record ${record.id} is not a Write Code interaction`)
  }
  return {
    deckId: record.deckId,
    prompt: record.prompt.value,
    tip: record.tip?.value ?? '',
    explanation: record.explanation?.value ?? '',
    language: record.interaction.language,
    starterCode: record.interaction.starterCode,
    acceptedAnswers: record.interaction.acceptedAnswers.map((code) => ({ id: newId(), code })),
    comparison: { ...record.interaction.comparison },
    tags: record.tags.join(', '),
  }
}

// Hydrates the form from a legacy v1 'codeCompletion' card via the existing
// lazy migrator — mirrors multipleChoiceForm.ts's legacyMcqCardToForm.
export function legacyWriteCodeCardToForm(card: Card): WriteCodeFormState {
  const v2 = migrateCard(card)
  if (v2.interaction.type !== 'write_code') {
    throw new Error(`Card ${card.id} (type '${card.type}') is not Write-Code-shaped`)
  }
  return {
    deckId: v2.deckId,
    prompt: v2.prompt.value,
    tip: v2.tip?.value ?? '',
    explanation: v2.explanation?.value ?? '',
    language: v2.interaction.language,
    starterCode: v2.interaction.starterCode,
    acceptedAnswers: v2.interaction.acceptedAnswers.map((code) => ({ id: newId(), code })),
    comparison: { ...v2.interaction.comparison },
    tags: v2.tags.join(', '),
  }
}

export interface WriteCodeValidation {
  canSave: boolean
  errors: string[]
}

// Pure validation shared by the editor's Save gating and its inline error
// list. Starter code is deliberately not required — a blank starting point is
// a valid Write Code card (learner writes the whole answer from scratch).
export function validateWriteCodeForm(form: WriteCodeFormState): WriteCodeValidation {
  const errors: string[] = []

  if (form.prompt.trim().length === 0) errors.push('Prompt is required.')
  if (form.acceptedAnswers.length === 0) errors.push('Add at least one accepted answer.')
  if (form.acceptedAnswers.some((a) => a.code.trim().length === 0)) {
    errors.push('All accepted answers need code.')
  }

  return { canSave: errors.length === 0, errors }
}
