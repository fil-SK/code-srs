import type { Card, CodeBlock } from '@/types'
import type {
  CardV2,
  MatchingColumn,
  MatchingColumnItem,
  OrderingItemV2,
  RichContent,
  WalkthroughStep,
} from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'

// Migrates a v1 Card (8 types) to the v2 CardV2/CardInteraction shape (6 types),
// per docs/itera-migration-plan.md §1. Pure and deterministic: same input always
// produces the same output, so it is safe to run lazily on read (see migration
// plan §3) or re-run idempotently. IDs, deck ownership, tags, and timestamps are
// always preserved verbatim — only `content`/`type` reshape into `interaction`.

function fence(code: CodeBlock): string {
  return '```' + code.language + '\n' + code.code + '\n```'
}

function joinMarkdown(...parts: (string | undefined)[]): string {
  return parts.filter((p) => p && p.trim().length > 0).join('\n\n')
}

// "26-34, 40" -> [{startLine:26,endLine:34},{startLine:40,endLine:40}]. Kept as
// ranges (not expanded to individual lines) since WalkthroughStep.focus is a
// range list — see docs/itera-migration-plan.md §5 on preserving multi-range
// highlighting rather than downgrading to the spec's single-range MVP shape.
function parseHighlightRanges(spec: string): Array<{ startLine: number; endLine: number }> {
  const out: Array<{ startLine: number; endLine: number }> = []
  for (const raw of spec.split(',')) {
    const token = raw.trim()
    if (!token) continue
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token)
    if (!m) continue
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    out.push({ startLine: Math.min(a, b), endLine: Math.max(a, b) })
  }
  return out
}

type Envelope = Pick<
  CardV2,
  'id' | 'schemaVersion' | 'deckId' | 'tags' | 'createdAt' | 'updatedAt'
>

function envelope(card: Card): Envelope {
  return {
    id: card.id,
    schemaVersion: CARD_V2_SCHEMA_VERSION,
    deckId: card.deckId,
    tags: card.tags,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  }
}

function optionalRichText(text: string | undefined): RichContent | undefined {
  return text?.trim() ? richText(text) : undefined
}

function migrateBasic(card: Extract<Card, { type: 'basic' }>): CardV2 {
  return {
    ...envelope(card),
    prompt: richText(card.content.front),
    explanation: optionalRichText(card.content.explanation),
    interaction: {
      type: 'recall',
      authoringPreset: 'standard',
      answer: richText(card.content.back),
    },
  }
}

function migrateCodeReading(card: Extract<Card, { type: 'codeReading' }>): CardV2 {
  return {
    ...envelope(card),
    prompt: richText(
      joinMarkdown(fence(card.content.code), card.content.question),
    ),
    explanation: optionalRichText(card.content.explanation),
    interaction: {
      type: 'recall',
      authoringPreset: 'code_reading',
      answer: richText(card.content.answer),
    },
  }
}

function migrateBugFinding(card: Extract<Card, { type: 'bugFinding' }>): CardV2 {
  // The old `explanation` is required and semantically *is* the answer here,
  // not a post-answer aside — it becomes `interaction.answer`, not
  // `card.explanation`. See docs/itera-migration-plan.md §5 (expected, not a bug).
  return {
    ...envelope(card),
    prompt: richText(
      joinMarkdown(fence(card.content.code), card.content.question ?? 'Find the bug.'),
    ),
    tip: optionalRichText(card.content.bugHint),
    interaction: {
      type: 'recall',
      authoringPreset: 'find_the_bug',
      answer: richText(card.content.explanation),
    },
  }
}

function migrateMcq(card: Extract<Card, { type: 'mcq' }>): CardV2 {
  return {
    ...envelope(card),
    prompt: richText(card.content.prompt),
    explanation: optionalRichText(card.content.explanation),
    interaction: {
      type: 'multiple_choice',
      selectionMode: card.content.multiple ? 'multiple' : 'single',
      randomizeOptions: false,
      options: card.content.options.map((o) => ({
        id: o.id,
        content: richText(o.text),
        correct: card.content.correct.includes(o.id),
      })),
    },
  }
}

function migrateCodeCompletion(
  card: Extract<Card, { type: 'codeCompletion' }>,
): CardV2 {
  return {
    ...envelope(card),
    prompt: richText(card.content.prompt ?? ''),
    explanation: optionalRichText(card.content.explanation),
    interaction: {
      type: 'write_code',
      language: card.content.scaffold.language,
      starterCode: card.content.scaffold.code,
      acceptedAnswers: card.content.solutions,
      comparison: {
        trimOuterWhitespace: true,
        normalizeLineEndings: true,
        ignoreTrailingWhitespace: card.content.validation.ignoreWhitespace,
        caseSensitive: card.content.validation.caseSensitive,
      },
    },
  }
}

function migrateOrdering(card: Extract<Card, { type: 'ordering' }>): CardV2 {
  const items: OrderingItemV2[] = card.content.items.map((item) => ({
    id: item.id,
    content: richText(joinMarkdown(item.text, item.code && fence(item.code))),
  }))
  return {
    ...envelope(card),
    prompt: richText(card.content.prompt),
    explanation: optionalRichText(card.content.explanation),
    interaction: {
      type: 'ordering',
      // Old items are stored in correct order and presented shuffled to the
      // learner, so `randomize: true` preserves existing behavior exactly.
      randomize: true,
      items,
      correctOrder: items.map((i) => i.id),
    },
  }
}

function migrateMatching(card: Extract<Card, { type: 'matching' }>): CardV2 {
  const { pairs, triple, headers, options } = card.content

  // Builds one column. Fixed columns share one value list across rows (graded
  // by value, matching this codebase's existing feature); unique columns get
  // one deterministic synthetic id per row (`${pairId}:col`), preserving the
  // old one-to-one-by-pairing semantics.
  function buildColumn(
    id: 'right' | 'third',
    label: string | undefined,
    valueOf: (p: (typeof pairs)[number]) => string | undefined,
    fixedValues: string[] | undefined,
  ): { column: MatchingColumn; resolve: (p: (typeof pairs)[number]) => string } {
    if (fixedValues?.length) {
      const items: MatchingColumnItem[] = fixedValues.map((v, i) => ({
        id: `${id}-fixed-${i}`,
        content: richText(v),
      }))
      const idByValue = new Map(items.map((it) => [it.content.value, it.id]))
      return {
        column: { id, label, items, fixed: true },
        resolve: (p) => idByValue.get(valueOf(p) ?? '') ?? items[0].id,
      }
    }
    const items: MatchingColumnItem[] = pairs.map((p) => ({
      id: `${p.id}:${id}`,
      content: richText(valueOf(p) ?? ''),
    }))
    return {
      column: { id, label, items, fixed: false },
      resolve: (p) => `${p.id}:${id}`,
    }
  }

  const left: MatchingColumn = {
    id: 'left',
    label: headers?.left,
    items: pairs.map((p) => ({ id: p.id, content: richText(p.left) })),
    fixed: false,
  }
  const right = buildColumn('right', headers?.right, (p) => p.right, options?.right)
  const third = triple
    ? buildColumn('third', headers?.third, (p) => p.third, options?.third)
    : undefined

  const columns = [left, right.column, ...(third ? [third.column] : [])]
  const relationships = pairs.map((p) => {
    const row: Record<string, string> = { left: p.id, right: right.resolve(p) }
    if (third) row.third = third.resolve(p)
    return row
  })

  return {
    ...envelope(card),
    prompt: richText(card.content.prompt),
    explanation: optionalRichText(card.content.explanation),
    interaction: { type: 'matching', columns, relationships },
  }
}

function migrateStory(card: Extract<Card, { type: 'story' }>): CardV2 {
  const steps: WalkthroughStep[] = card.content.steps.map((s) => ({
    id: s.id,
    focus: s.highlight ? parseHighlightRanges(s.highlight) : undefined,
    prompt: richText(s.prompt),
    response: {
      type: 'recall',
      answer: richText(joinMarkdown(s.answer, s.code && fence(s.code))),
    },
  }))
  return {
    ...envelope(card),
    prompt: richText(card.content.intro ?? ''),
    explanation: optionalRichText(card.content.explanation),
    interaction: {
      type: 'walkthrough',
      scenario: richText(card.content.intro ?? ''),
      code: card.content.code
        ? { language: card.content.code.language, value: card.content.code.code }
        : undefined,
      image: card.content.image,
      steps,
    },
  }
}

export function migrateCard(card: Card): CardV2 {
  switch (card.type) {
    case 'basic':
      return migrateBasic(card)
    case 'codeReading':
      return migrateCodeReading(card)
    case 'bugFinding':
      return migrateBugFinding(card)
    case 'mcq':
      return migrateMcq(card)
    case 'codeCompletion':
      return migrateCodeCompletion(card)
    case 'ordering':
      return migrateOrdering(card)
    case 'matching':
      return migrateMatching(card)
    case 'story':
      return migrateStory(card)
    default: {
      const _exhaustive: never = card
      return _exhaustive
    }
  }
}
