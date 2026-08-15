import type { Card } from '@/types'
import type {
  CardV2,
  CardV2Record,
  RichContent,
  WalkthroughInteraction,
  WalkthroughStep,
  WalkthroughStepResponse,
} from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'
import type { SchedulingState } from '@/types/review'
import { newId } from '@/lib/id'
import { migrateCard } from '@/domain/migration/cardMigration'
import type { McOptionFormState } from './multipleChoiceForm'

// The Walkthrough editor's in-memory form shape. A step is a flat object with
// every response type's fields present but only meaningful when
// `responseType` selects it — mirrors MatchingColumnFormState's `fixed` +
// `options`-meaningful-only-when-fixed convention rather than a discriminated
// union, so switching response type in the UI never needs to reconstruct the
// whole step object. Line ranges are authored as start/end row pairs (not a
// free-text spec string) so validation stays direct — no other v2 editor
// parses a free-text schema.
export interface WalkthroughRangeFormState {
  id: string
  start: string
  end: string
}

export interface WalkthroughAcceptedAnswerFormState {
  id: string
  text: string
}

export type WalkthroughStepResponseType = WalkthroughStepResponse['type']

export interface WalkthroughStepFormState {
  id: string
  prompt: string
  tip: string
  explanation: string
  ranges: WalkthroughRangeFormState[]
  responseType: WalkthroughStepResponseType
  recallAnswer: string // meaningful only when responseType === 'recall'
  mcSelectionMode: 'single' | 'multiple' // meaningful only when responseType === 'multiple_choice'
  mcOptions: McOptionFormState[] // meaningful only when responseType === 'multiple_choice'
  acceptedAnswers: WalkthroughAcceptedAnswerFormState[] // meaningful only when responseType === 'exact_input'
}

export interface WalkthroughFormState {
  deckId: string
  prompt: string
  tip: string
  explanation: string
  scenario: string
  codeLanguage: string
  codeValue: string
  image: string | undefined
  steps: WalkthroughStepFormState[]
  tags: string // comma-separated, matching the v1 editor's convention
}

function emptyWalkthroughStep(): WalkthroughStepFormState {
  return {
    id: newId(),
    prompt: '',
    tip: '',
    explanation: '',
    ranges: [],
    responseType: 'recall',
    recallAnswer: '',
    mcSelectionMode: 'single',
    mcOptions: [],
    acceptedAnswers: [],
  }
}

export function emptyWalkthroughForm(deckId = ''): WalkthroughFormState {
  return {
    deckId,
    prompt: '',
    tip: '',
    explanation: '',
    scenario: '',
    codeLanguage: 'cpp',
    codeValue: '',
    image: undefined,
    steps: [emptyWalkthroughStep()],
    tags: '',
  }
}

function optionalRichText(text: string | undefined): RichContent | undefined {
  return text?.trim() ? richText(text) : undefined
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

function countCodeLines(codeValue: string): number {
  return codeValue.length === 0 ? 0 : codeValue.split('\n').length
}

function isValidRange(range: WalkthroughRangeFormState): boolean {
  const start = Number(range.start)
  const end = Number(range.end)
  return Number.isInteger(start) && Number.isInteger(end) && start > 0 && end > 0 && start <= end
}

function toStepFocus(
  ranges: WalkthroughRangeFormState[],
): Array<{ startLine: number; endLine: number }> | undefined {
  const valid = ranges
    .filter(isValidRange)
    .map((r) => ({ startLine: Number(r.start), endLine: Number(r.end) }))
  return valid.length > 0 ? valid : undefined
}

function toStepResponse(step: WalkthroughStepFormState): WalkthroughStepResponse {
  if (step.responseType === 'multiple_choice') {
    return {
      type: 'multiple_choice',
      selectionMode: step.mcSelectionMode,
      options: step.mcOptions.map((o) => ({ id: o.id, content: richText(o.text), correct: o.correct })),
    }
  }
  if (step.responseType === 'exact_input') {
    return {
      type: 'exact_input',
      acceptedAnswers: step.acceptedAnswers.map((a) => a.text),
    }
  }
  return { type: 'recall', answer: richText(step.recallAnswer) }
}

function toWalkthroughInteraction(form: WalkthroughFormState): WalkthroughInteraction {
  return {
    type: 'walkthrough',
    scenario: richText(form.scenario),
    code: form.codeValue.trim() ? { language: form.codeLanguage, value: form.codeValue } : undefined,
    image: form.image,
    steps: form.steps.map(
      (s): WalkthroughStep => ({
        id: s.id,
        focus: toStepFocus(s.ranges),
        prompt: richText(s.prompt),
        tip: optionalRichText(s.tip),
        explanation: optionalRichText(s.explanation),
        response: toStepResponse(s),
      }),
    ),
  }
}

// Builds the throwaway object the live-preview pane renders through the real
// ReviewSessionScreen. Never persisted as-is, so timestamps are nominal.
export function walkthroughFormToPreviewCard(
  form: WalkthroughFormState,
  id: string,
): CardV2 & { interaction: WalkthroughInteraction } {
  return {
    id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: toWalkthroughInteraction(form),
    tags: parseTags(form.tags),
    createdAt: 0,
    updatedAt: 0,
  }
}

// The envelope fields the form itself doesn't own: identity, provenance, and
// scheduling. Fresh for a new card; carried over verbatim when editing an
// existing CardV2Record or migrating a legacy v1 card.
export interface WalkthroughEnvelope {
  id: string
  createdAt: number
  suspended: boolean
  scheduling: SchedulingState
  order?: number
}

export function walkthroughFormToRecord(
  form: WalkthroughFormState,
  envelope: WalkthroughEnvelope,
  now: number = Date.now(),
): CardV2Record {
  return {
    id: envelope.id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: form.deckId,
    prompt: richText(form.prompt),
    tip: optionalRichText(form.tip),
    explanation: optionalRichText(form.explanation),
    interaction: toWalkthroughInteraction(form),
    tags: parseTags(form.tags),
    createdAt: envelope.createdAt,
    updatedAt: now,
    suspended: envelope.suspended,
    scheduling: envelope.scheduling,
    order: envelope.order,
  }
}

function walkthroughInteractionToForm(interaction: WalkthroughInteraction): {
  scenario: string
  codeLanguage: string
  codeValue: string
  image: string | undefined
  steps: WalkthroughStepFormState[]
} {
  return {
    scenario: interaction.scenario.value,
    codeLanguage: interaction.code?.language ?? 'cpp',
    codeValue: interaction.code?.value ?? '',
    image: interaction.image,
    steps: interaction.steps.map((s) => ({
      id: s.id,
      prompt: s.prompt.value,
      tip: s.tip?.value ?? '',
      explanation: s.explanation?.value ?? '',
      ranges: (s.focus ?? []).map((r) => ({
        id: newId(),
        start: String(r.startLine),
        end: String(r.endLine),
      })),
      responseType: s.response.type,
      recallAnswer: s.response.type === 'recall' ? s.response.answer.value : '',
      mcSelectionMode: s.response.type === 'multiple_choice' ? s.response.selectionMode : 'single',
      mcOptions:
        s.response.type === 'multiple_choice'
          ? s.response.options.map((o) => ({ id: o.id, text: o.content.value, correct: o.correct }))
          : [],
      acceptedAnswers:
        s.response.type === 'exact_input'
          ? s.response.acceptedAnswers.map((text) => ({ id: newId(), text }))
          : [],
    })),
  }
}

export function cardV2RecordToWalkthroughForm(record: CardV2Record): WalkthroughFormState {
  if (record.interaction.type !== 'walkthrough') {
    throw new Error(`CardV2Record ${record.id} is not a Walkthrough interaction`)
  }
  const { scenario, codeLanguage, codeValue, image, steps } = walkthroughInteractionToForm(
    record.interaction,
  )
  return {
    deckId: record.deckId,
    prompt: record.prompt.value,
    tip: record.tip?.value ?? '',
    explanation: record.explanation?.value ?? '',
    scenario,
    codeLanguage,
    codeValue,
    image,
    steps,
    tags: record.tags.join(', '),
  }
}

// Hydrates the form from a legacy v1 'story' card via the existing lazy
// migrator — mirrors legacyMatchingCardToForm. migrateStory's single-range
// `highlight` spec string round-trips into one WalkthroughRangeFormState row
// per parsed range.
export function legacyStoryCardToForm(card: Card): WalkthroughFormState {
  const v2 = migrateCard(card)
  if (v2.interaction.type !== 'walkthrough') {
    throw new Error(`Card ${card.id} (type '${card.type}') is not Walkthrough-shaped`)
  }
  const { scenario, codeLanguage, codeValue, image, steps } = walkthroughInteractionToForm(
    v2.interaction,
  )
  return {
    deckId: v2.deckId,
    prompt: v2.prompt.value,
    tip: v2.tip?.value ?? '',
    explanation: v2.explanation?.value ?? '',
    scenario,
    codeLanguage,
    codeValue,
    image,
    steps,
    tags: v2.tags.join(', '),
  }
}

export interface WalkthroughValidation {
  canSave: boolean
  errors: string[]
}

// Pure validation shared by the editor's Save gating and its inline error
// list: shared prompt/scenario, at least one complete step, and per-step
// requirements matched to that step's response type. Line ranges are checked
// for well-formedness and, when shared code exists, against its actual line
// count ("ranges outside the current code should be surfaced clearly").
export function validateWalkthroughForm(form: WalkthroughFormState): WalkthroughValidation {
  const errors: string[] = []

  if (form.prompt.trim().length === 0) errors.push('Prompt is required.')
  if (form.scenario.trim().length === 0) errors.push('Scenario is required.')
  if (form.steps.length === 0) errors.push('Add at least one step.')

  const hasCode = form.codeValue.trim().length > 0
  const totalLines = countCodeLines(form.codeValue)

  form.steps.forEach((step, i) => {
    const label = `Step ${i + 1}`
    if (step.prompt.trim().length === 0) errors.push(`${label} needs a prompt.`)

    if (step.responseType === 'recall') {
      if (step.recallAnswer.trim().length === 0) errors.push(`${label} needs an answer.`)
    } else if (step.responseType === 'multiple_choice') {
      if (step.mcOptions.length < 2) errors.push(`${label} needs at least 2 options.`)
      if (step.mcOptions.some((o) => o.text.trim().length === 0)) {
        errors.push(`${label}'s options can't be blank.`)
      }
      const correctCount = step.mcOptions.filter((o) => o.correct).length
      if (correctCount === 0) errors.push(`${label} needs at least one correct option.`)
      if (step.mcSelectionMode === 'single' && correctCount > 1) {
        errors.push(`${label} is single-select but has more than one correct option.`)
      }
    } else {
      if (step.acceptedAnswers.every((a) => a.text.trim().length === 0)) {
        errors.push(`${label} needs at least one accepted answer.`)
      }
    }

    for (const range of step.ranges) {
      const start = Number(range.start)
      const end = Number(range.end)
      if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0) {
        errors.push(`${label} has an invalid line range.`)
      } else if (start > end) {
        errors.push(`${label}'s line range starts after it ends.`)
      } else if (!hasCode) {
        errors.push(`${label} highlights lines, but no shared code was added.`)
      } else if (end > totalLines) {
        errors.push(`${label}'s highlighted range goes past the code's ${totalLines} lines.`)
      }
    }
  })

  // Two ranges on the same step can fail identically (e.g. both left
  // blank) before the author has filled either one in — deduped so the
  // rendered error list never has two entries with the same text (and thus
  // the same React key).
  return { canSave: errors.length === 0, errors: Array.from(new Set(errors)) }
}

// ---- Pure mutation helpers ----
// Exported (rather than local closures in the Fields component, unlike
// MC/Ordering/Write Code's convention) because steps nest ranges/options/
// accepted-answers one level deeper than any prior type's form — the same
// reason matchingForm.ts made this call — so cascade-cleanup invariants
// (removing a step must not corrupt another step's ids/state) stay directly
// unit-testable.

export function addWalkthroughStep(form: WalkthroughFormState): WalkthroughFormState {
  return { ...form, steps: [...form.steps, emptyWalkthroughStep()] }
}

export function removeWalkthroughStep(
  form: WalkthroughFormState,
  stepId: string,
): WalkthroughFormState {
  return { ...form, steps: form.steps.filter((s) => s.id !== stepId) }
}

export function moveWalkthroughStep(
  form: WalkthroughFormState,
  stepId: string,
  direction: -1 | 1,
): WalkthroughFormState {
  const index = form.steps.findIndex((s) => s.id === stepId)
  const target = index + direction
  if (index === -1 || target < 0 || target >= form.steps.length) return form
  const steps = [...form.steps]
  ;[steps[index], steps[target]] = [steps[target], steps[index]]
  return { ...form, steps }
}

export function updateWalkthroughStepPrompt(
  form: WalkthroughFormState,
  stepId: string,
  prompt: string,
): WalkthroughFormState {
  return { ...form, steps: form.steps.map((s) => (s.id === stepId ? { ...s, prompt } : s)) }
}

export function updateWalkthroughStepTip(
  form: WalkthroughFormState,
  stepId: string,
  tip: string,
): WalkthroughFormState {
  return { ...form, steps: form.steps.map((s) => (s.id === stepId ? { ...s, tip } : s)) }
}

export function updateWalkthroughStepExplanation(
  form: WalkthroughFormState,
  stepId: string,
  explanation: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) => (s.id === stepId ? { ...s, explanation } : s)),
  }
}

export function updateWalkthroughRecallAnswer(
  form: WalkthroughFormState,
  stepId: string,
  recallAnswer: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) => (s.id === stepId ? { ...s, recallAnswer } : s)),
  }
}

// Switching response type never tries to reinterpret a step's existing
// fields as another type's shape — like setColumnFixed, it resets every
// type-specific field to a fresh default for the newly chosen type.
export function setWalkthroughStepResponseType(
  form: WalkthroughFormState,
  stepId: string,
  responseType: WalkthroughStepResponseType,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            responseType,
            recallAnswer: '',
            mcSelectionMode: 'single',
            mcOptions:
              responseType === 'multiple_choice'
                ? [
                    { id: newId(), text: '', correct: false },
                    { id: newId(), text: '', correct: false },
                  ]
                : [],
            acceptedAnswers:
              responseType === 'exact_input' ? [{ id: newId(), text: '' }] : [],
          }
        : s,
    ),
  }
}

export function addWalkthroughRange(
  form: WalkthroughFormState,
  stepId: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId ? { ...s, ranges: [...s.ranges, { id: newId(), start: '', end: '' }] } : s,
    ),
  }
}

export function updateWalkthroughRange(
  form: WalkthroughFormState,
  stepId: string,
  rangeId: string,
  patch: Partial<Pick<WalkthroughRangeFormState, 'start' | 'end'>>,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId
        ? { ...s, ranges: s.ranges.map((r) => (r.id === rangeId ? { ...r, ...patch } : r)) }
        : s,
    ),
  }
}

export function removeWalkthroughRange(
  form: WalkthroughFormState,
  stepId: string,
  rangeId: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId ? { ...s, ranges: s.ranges.filter((r) => r.id !== rangeId) } : s,
    ),
  }
}

export function addWalkthroughMcOption(
  form: WalkthroughFormState,
  stepId: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId
        ? { ...s, mcOptions: [...s.mcOptions, { id: newId(), text: '', correct: false }] }
        : s,
    ),
  }
}

export function renameWalkthroughMcOption(
  form: WalkthroughFormState,
  stepId: string,
  optionId: string,
  text: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId
        ? { ...s, mcOptions: s.mcOptions.map((o) => (o.id === optionId ? { ...o, text } : o)) }
        : s,
    ),
  }
}

export function moveWalkthroughMcOption(
  form: WalkthroughFormState,
  stepId: string,
  optionId: string,
  direction: -1 | 1,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) => {
      if (s.id !== stepId) return s
      const index = s.mcOptions.findIndex((o) => o.id === optionId)
      const target = index + direction
      if (index === -1 || target < 0 || target >= s.mcOptions.length) return s
      const mcOptions = [...s.mcOptions]
      ;[mcOptions[index], mcOptions[target]] = [mcOptions[target], mcOptions[index]]
      return { ...s, mcOptions }
    }),
  }
}

export function removeWalkthroughMcOption(
  form: WalkthroughFormState,
  stepId: string,
  optionId: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId ? { ...s, mcOptions: s.mcOptions.filter((o) => o.id !== optionId) } : s,
    ),
  }
}

// Single-select toggling clears every other option's correct flag, same
// invariant as MultipleChoiceFields.tsx's toggleCorrect/setSelectionMode.
export function toggleWalkthroughMcOptionCorrect(
  form: WalkthroughFormState,
  stepId: string,
  optionId: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) => {
      if (s.id !== stepId) return s
      if (s.mcSelectionMode === 'multiple') {
        return {
          ...s,
          mcOptions: s.mcOptions.map((o) =>
            o.id === optionId ? { ...o, correct: !o.correct } : o,
          ),
        }
      }
      return { ...s, mcOptions: s.mcOptions.map((o) => ({ ...o, correct: o.id === optionId })) }
    }),
  }
}

export function setWalkthroughMcSelectionMode(
  form: WalkthroughFormState,
  stepId: string,
  mode: 'single' | 'multiple',
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) => {
      if (s.id !== stepId) return s
      if (mode === 'single') {
        const firstCorrectIndex = s.mcOptions.findIndex((o) => o.correct)
        return {
          ...s,
          mcSelectionMode: mode,
          mcOptions: s.mcOptions.map((o, i) => ({ ...o, correct: i === firstCorrectIndex })),
        }
      }
      return { ...s, mcSelectionMode: mode }
    }),
  }
}

export function addWalkthroughAcceptedAnswer(
  form: WalkthroughFormState,
  stepId: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId
        ? { ...s, acceptedAnswers: [...s.acceptedAnswers, { id: newId(), text: '' }] }
        : s,
    ),
  }
}

export function updateWalkthroughAcceptedAnswer(
  form: WalkthroughFormState,
  stepId: string,
  answerId: string,
  text: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            acceptedAnswers: s.acceptedAnswers.map((a) =>
              a.id === answerId ? { ...a, text } : a,
            ),
          }
        : s,
    ),
  }
}

export function removeWalkthroughAcceptedAnswer(
  form: WalkthroughFormState,
  stepId: string,
  answerId: string,
): WalkthroughFormState {
  return {
    ...form,
    steps: form.steps.map((s) =>
      s.id === stepId
        ? { ...s, acceptedAnswers: s.acceptedAnswers.filter((a) => a.id !== answerId) }
        : s,
    ),
  }
}
