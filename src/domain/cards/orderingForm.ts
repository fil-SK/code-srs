import type {
  Card,
  OrderingInteraction,
  RichContent,
} from '@/types/card'
import { CARD_SCHEMA_VERSION, richText } from '@/types/card'
import type {
  SchedulingState,
} from '@/types/review'
import { initialSchedulingState } from '@/domain/scheduling/state'
import { newId } from '@/lib/id'

// The Ordering editor's in-memory form shape. Mirrors multipleChoiceForm.ts's
// plain-string convention — RichContent wrapping only happens at the
// read/write boundary (preview object, persisted record). Item `id` IS
// persisted (like McOptionFormState.id, unlike Write Code's throwaway
// per-answer id) because OrderingInteraction.correctOrder references these
// same ids. The list's own order IS the correct order — there is no
// separate "mark correct" control, so correctOrder is always derived as
// form.items.map(i => i.id) at save/preview time.
export interface OrderingItemFormState {
  id: string
  text: string
}

export interface OrderingFormState {
  deckId: string
  prompt: string
  tip: string
  explanation: string
  randomize: boolean
  items: OrderingItemFormState[]
  tags: string // comma-separated, matching the v1 editor's convention
}

export function emptyOrderingForm(deckId = ''): OrderingFormState {
  return {
    deckId,
    prompt: '',
    tip: '',
    explanation: '',
    randomize: false,
    items: [
      { id: newId(), text: '' },
      { id: newId(), text: '' },
      { id: newId(), text: '' },
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

function toOrderingInteraction(form: OrderingFormState): OrderingInteraction {
  const items = form.items.map((i) => ({ id: i.id, content: richText(i.text) }))
  return {
    type: 'ordering',
    randomize: form.randomize,
    items,
    correctOrder: items.map((i) => i.id),
  }
}

// Builds the throwaway object the live-preview pane renders through the real
// ReviewSessionScreen. Never persisted as-is, so timestamps are nominal.
export function orderingFormToPreviewCard(
  form: OrderingFormState,
  id: string,
): Card & { interaction: OrderingInteraction } {
  return {
    id,
    schemaVersion: CARD_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: toOrderingInteraction(form),
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
export interface OrderingEnvelope {
  id: string
  createdAt: number
  suspended: boolean
  scheduling: SchedulingState
  order?: number
}

export function orderingFormToRecord(
  form: OrderingFormState,
  envelope: OrderingEnvelope,
  now: number = Date.now(),
): Card {
  return {
    id: envelope.id,
    schemaVersion: CARD_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: toOrderingInteraction(form),
    tags: parseTags(form.tags),
    createdAt: envelope.createdAt,
    updatedAt: now,
    suspended: envelope.suspended,
    scheduling: envelope.scheduling,
    order: envelope.order,
  }
}

export function cardRecordToOrderingForm(record: Card): OrderingFormState {
  if (record.interaction.type !== 'ordering') {
    throw new Error(`Card ${record.id} is not an Ordering interaction`)
  }
  return {
    deckId: record.deckId,
    prompt: record.prompt.value,
    tip: record.tip?.value ?? '',
    explanation: record.explanation?.value ?? '',
    randomize: record.interaction.randomize,
    items: record.interaction.items.map((i) => ({ id: i.id, text: i.content.value })),
    tags: record.tags.join(', '),
  }
}


export interface OrderingValidation {
  canSave: boolean
  errors: string[]
}

// Pure validation shared by the editor's Save gating and its inline error
// list: enough items to have a meaningful order, and every item filled in.
export function validateOrderingForm(form: OrderingFormState): OrderingValidation {
  const errors: string[] = []

  if (form.prompt.trim().length === 0) errors.push('Prompt is required.')
  if (form.items.length < 2) errors.push('Add at least 2 items.')
  if (form.items.some((i) => i.text.trim().length === 0)) errors.push('All items need text.')

  return { canSave: errors.length === 0, errors }
}
