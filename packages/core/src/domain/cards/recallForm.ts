import type {
  AuthoringPreset,
  Card,
  RecallInteraction,
  RichContent,
} from '../../types/card'
import { CARD_SCHEMA_VERSION, richText } from '../../types/card'
import type {
  SchedulingState,
} from '../../types/review'
import { initialSchedulingState } from '../scheduling/state'

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
): Card & { interaction: RecallInteraction } {
  return {
    id,
    schemaVersion: CARD_SCHEMA_VERSION,
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
    suspended: false,
    scheduling: initialSchedulingState(0),
  }
}

// The envelope fields the form itself doesn't own: identity, provenance, and
// scheduling. Fresh for a new card; carried over verbatim when editing an
// existing Card.
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
): Card {
  return {
    id: envelope.id,
    schemaVersion: CARD_SCHEMA_VERSION,
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

export function cardRecordToForm(record: Card): RecallFormState {
  if (record.interaction.type !== 'recall') {
    throw new Error(`Card ${record.id} is not a Recall interaction`)
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

