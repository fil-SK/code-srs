import type { Card } from '@/types'
import type {
  AuthoringPreset,
  CardV2,
  CardV2Record,
  RecallInteraction,
  RichContent,
} from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'
import type { SchedulingState } from '@/types/review'
import { migrateCard } from '@/domain/migration/cardMigration'

// The Recall editor's in-memory form shape. Plain strings throughout —
// RichContent wrapping only happens at the read/write boundary (preview
// object, persisted record) so the form itself stays a simple, serializable
// snapshot of the text areas.
export interface RecallFormState {
  deckId: string
  prompt: string
  tip: string
  explanation: string
  answer: string
  authoringPreset: AuthoringPreset
  tags: string // comma-separated, matching the v1 editor's convention
}

export function emptyRecallForm(deckId = ''): RecallFormState {
  return {
    deckId,
    prompt: '',
    tip: '',
    explanation: '',
    answer: '',
    authoringPreset: 'standard',
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

// Builds the throwaway object the live-preview pane (and the editor's
// "Study this Card" style preview) renders through the real ReviewSessionScreen.
// Never persisted as-is, so timestamps are nominal.
export function recallFormToPreviewCard(
  form: RecallFormState,
  id: string,
): CardV2 & { interaction: RecallInteraction } {
  return {
    id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: {
      type: 'recall',
      authoringPreset: form.authoringPreset,
      answer: richText(form.answer),
    },
    tags: parseTags(form.tags),
    createdAt: 0,
    updatedAt: 0,
  }
}

// The envelope fields the form itself doesn't own: identity, provenance, and
// scheduling. Fresh for a new card; carried over verbatim when editing an
// existing CardV2Record or migrating a legacy v1 card.
export interface RecallEnvelope {
  id: string
  createdAt: number
  suspended: boolean
  scheduling: SchedulingState
  order?: number
}

export function recallFormToRecord(
  form: RecallFormState,
  envelope: RecallEnvelope,
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
      type: 'recall',
      authoringPreset: form.authoringPreset,
      answer: richText(form.answer),
    },
    tags: parseTags(form.tags),
    createdAt: envelope.createdAt,
    updatedAt: now,
    suspended: envelope.suspended,
    scheduling: envelope.scheduling,
    order: envelope.order,
  }
}

export function cardV2RecordToForm(record: CardV2Record): RecallFormState {
  if (record.interaction.type !== 'recall') {
    throw new Error(`CardV2Record ${record.id} is not a Recall interaction`)
  }
  return {
    deckId: record.deckId,
    prompt: record.prompt.value,
    tip: record.tip?.value ?? '',
    explanation: record.explanation?.value ?? '',
    answer: record.interaction.answer.value,
    authoringPreset: record.interaction.authoringPreset ?? 'standard',
    tags: record.tags.join(', '),
  }
}

// Hydrates the form from a legacy v1 'basic'/'codeReading'/'bugFinding' card
// via the existing lazy migrator — the only place this codebase runs
// migrateCard() outside of Review.
export function legacyCardToForm(card: Card): RecallFormState {
  const v2 = migrateCard(card)
  if (v2.interaction.type !== 'recall') {
    throw new Error(`Card ${card.id} (type '${card.type}') is not Recall-shaped`)
  }
  return {
    deckId: v2.deckId,
    prompt: v2.prompt.value,
    tip: v2.tip?.value ?? '',
    explanation: v2.explanation?.value ?? '',
    answer: v2.interaction.answer.value,
    authoringPreset: v2.interaction.authoringPreset ?? 'standard',
    tags: v2.tags.join(', '),
  }
}
