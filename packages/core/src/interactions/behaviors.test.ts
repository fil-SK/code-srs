// The six shared interaction behaviors, asserted where they now live.
//
// This suite tests *wiring*, not grading: each grader already has its own
// exhaustive file under domain/grading/, and duplicating those cases here
// would mean two places to update when a rule changes. What is checked here is
// that each behavior reports the right type, routes to the right grader and
// the right readiness rule, preserves partial credit rather than flattening it
// to a boolean, and keeps `null` distinct from `{correct:false}`.
//
// It runs in the core Vitest project: no DOM, no setup file, no configured
// repository. A behavior that needed any of those would not be shareable.
import { describe, expect, it } from 'vitest'
import type {
  MatchingInteraction,
  MultipleChoiceInteraction,
  OrderingInteraction,
  WalkthroughInteraction,
  WriteCodeInteraction,
  InteractionType,
} from '../types/card'
import { richText } from '../types/card'
import { initialWalkthroughState, type WalkthroughState } from './walkthroughState'
import { recallBehavior } from './recall'
import { multipleChoiceBehavior } from './multipleChoice'
import { writeCodeBehavior } from './writeCode'
import { orderingBehavior } from './ordering'
import { matchingBehavior } from './matching'
import { walkthroughBehavior } from './walkthrough'

// Structurally typed rather than as InteractionBehavior<T>: `satisfies` keeps
// each behavior's own literal type (which is what makes isResponseReady
// callable without `?.`), and those six literal types have no common
// instantiation of the generic. This is the widest shape the set-level
// assertions below need, and every member is assignable to it with no cast.
const ALL: ReadonlyArray<{
  type: InteractionType
  interactive: boolean
  isResponseReady?: unknown
  autoGrade?: unknown
  widthFor?: unknown
}> = [
  recallBehavior,
  multipleChoiceBehavior,
  writeCodeBehavior,
  orderingBehavior,
  matchingBehavior,
  walkthroughBehavior,
]

describe('the shared behavior set', () => {
  it('covers exactly the six interaction types, once each', () => {
    const types = ALL.map((b) => b.type)
    expect(types).toEqual([
      'recall',
      'multiple_choice',
      'write_code',
      'ordering',
      'matching',
      'walkthrough',
    ])
    expect(new Set(types).size).toBe(ALL.length)
  })

  it('marks only Recall as self-graded', () => {
    expect(recallBehavior.interactive).toBe(false)
    for (const behavior of ALL.filter((b) => b.type !== 'recall')) {
      expect(behavior.interactive, behavior.type).toBe(true)
    }
  })

  it('leaves the surface-width intent unstated except for Matching', () => {
    for (const behavior of ALL.filter((b) => b.type !== 'matching')) {
      expect(behavior.widthFor, behavior.type).toBeUndefined()
    }
  })
})

describe('recall', () => {
  it('has no objective grading path at all', () => {
    // Not a stub returning {correct:false}: "nothing to grade" is the product
    // rule, and inventing a grader here would make the shell suggest a rating
    // for content that was never checked.
    expect(recallBehavior).not.toHaveProperty('autoGrade')
    expect(recallBehavior).not.toHaveProperty('isResponseReady')
  })
})

describe('multiple choice', () => {
  const interaction: MultipleChoiceInteraction = {
    type: 'multiple_choice',
    selectionMode: 'multiple',
    randomizeOptions: false,
    options: [
      { id: 'a', content: richText('A'), correct: true },
      { id: 'b', content: richText('B'), correct: true },
      { id: 'c', content: richText('C'), correct: false },
    ],
  }

  // Multiple Choice and Write Code decide readiness from the response alone,
  // so their shared signature takes no interaction. Ordering, Matching and
  // Walkthrough all need the authored content to answer it.
  it('is not ready until something is selected', () => {
    expect(multipleChoiceBehavior.isResponseReady(undefined)).toBe(false)
    expect(multipleChoiceBehavior.isResponseReady([])).toBe(false)
  })

  it('is ready once at least one option is selected', () => {
    expect(multipleChoiceBehavior.isResponseReady(['a'])).toBe(true)
  })

  it('grades the exact set as correct', () => {
    expect(multipleChoiceBehavior.autoGrade(interaction, ['a', 'b'])).toMatchObject({
      correct: true,
    })
  })

  it('grades a subset or a superset as incorrect', () => {
    expect(multipleChoiceBehavior.autoGrade(interaction, ['a'])).toMatchObject({ correct: false })
    expect(multipleChoiceBehavior.autoGrade(interaction, ['a', 'b', 'c'])).toMatchObject({
      correct: false,
    })
  })

  it('treats a missing response as an empty selection rather than throwing', () => {
    expect(multipleChoiceBehavior.autoGrade(interaction, undefined)).toMatchObject({
      correct: false,
    })
  })
})

describe('write code', () => {
  const interaction: WriteCodeInteraction = {
    type: 'write_code',
    language: 'cpp',
    starterCode: '',
    acceptedAnswers: ['int main() {}'],
    comparison: {
      trimOuterWhitespace: true,
      normalizeLineEndings: true,
      ignoreTrailingWhitespace: true,
      caseSensitive: true,
    },
  }

  it('is not ready while the editor is empty or whitespace', () => {
    expect(writeCodeBehavior.isResponseReady(undefined)).toBe(false)
    expect(writeCodeBehavior.isResponseReady('')).toBe(false)
    expect(writeCodeBehavior.isResponseReady('   \n ')).toBe(false)
  })

  it('is ready once anything has been typed', () => {
    expect(writeCodeBehavior.isResponseReady('x')).toBe(true)
  })

  it('accepts an answer that differs only by the configured normalization', () => {
    expect(writeCodeBehavior.autoGrade(interaction, '  int main() {}  \r\n')).toEqual({
      correct: true,
    })
  })

  it('rejects a genuinely different answer, and case still matters here', () => {
    expect(writeCodeBehavior.autoGrade(interaction, 'int Main() {}')).toEqual({ correct: false })
    expect(writeCodeBehavior.autoGrade(interaction, undefined)).toEqual({ correct: false })
  })
})

describe('ordering', () => {
  const interaction: OrderingInteraction = {
    type: 'ordering',
    randomize: false,
    items: [
      { id: '1', content: richText('one') },
      { id: '2', content: richText('two') },
      { id: '3', content: richText('three') },
    ],
    correctOrder: ['1', '2', '3'],
  }

  it('is not ready for a partial or duplicated arrangement', () => {
    expect(orderingBehavior.isResponseReady(undefined, interaction)).toBe(false)
    expect(orderingBehavior.isResponseReady(['1', '2'], interaction)).toBe(false)
    expect(orderingBehavior.isResponseReady(['1', '1', '2'], interaction)).toBe(false)
  })

  it('is ready for a complete permutation, which is why submission is explicit', () => {
    expect(orderingBehavior.isResponseReady(['3', '2', '1'], interaction)).toBe(true)
  })

  it('keeps partial credit rather than collapsing to a boolean', () => {
    expect(orderingBehavior.autoGrade(interaction, ['1', '3', '2'])).toEqual({
      correct: false,
      score: 1 / 3,
    })
    expect(orderingBehavior.autoGrade(interaction, ['1', '2', '3'])).toEqual({
      correct: true,
      score: 1,
    })
  })
})

describe('matching', () => {
  function board(columnCount: 2 | 3): MatchingInteraction {
    const columns = [
      {
        id: 'term',
        items: [
          { id: 't1', content: richText('t1') },
          { id: 't2', content: richText('t2') },
        ],
      },
      {
        id: 'def',
        items: [
          { id: 'd1', content: richText('d1') },
          { id: 'd2', content: richText('d2') },
        ],
      },
      {
        id: 'extra',
        items: [
          { id: 'e1', content: richText('e1') },
          { id: 'e2', content: richText('e2') },
        ],
      },
    ].slice(0, columnCount)

    const rows = [
      { term: 't1', def: 'd1', extra: 'e1' },
      { term: 't2', def: 'd2', extra: 'e2' },
    ]
    const relationships = rows.map((row) => {
      const kept: Record<string, string> = {}
      for (const col of columns) kept[col.id] = row[col.id as keyof typeof row]
      return kept
    })

    return { type: 'matching', columns, relationships }
  }

  const twoColumn = board(2)

  it('is not ready while any cell is unfilled', () => {
    expect(matchingBehavior.isResponseReady(undefined, twoColumn)).toBe(false)
    expect(matchingBehavior.isResponseReady({ t1: { def: 'd1' } }, twoColumn)).toBe(false)
  })

  it('is ready once every authored cell has a choice', () => {
    expect(
      matchingBehavior.isResponseReady({ t1: { def: 'd1' }, t2: { def: 'd2' } }, twoColumn),
    ).toBe(true)
  })

  it('keeps the per-cell fraction as partial credit', () => {
    expect(matchingBehavior.autoGrade(twoColumn, { t1: { def: 'd1' }, t2: { def: 'd1' } })).toEqual({
      correct: false,
      score: 0.5,
    })
    expect(matchingBehavior.autoGrade(twoColumn, { t1: { def: 'd1' }, t2: { def: 'd2' } })).toEqual({
      correct: true,
      score: 1,
    })
  })

  it('asks for the wide surface only once a third column exists', () => {
    expect(matchingBehavior.widthFor(twoColumn)).toBe('default')
    expect(matchingBehavior.widthFor(board(3))).toBe('wide')
  })
})

describe('walkthrough', () => {
  const interaction: WalkthroughInteraction = {
    type: 'walkthrough',
    scenario: richText('scenario'),
    steps: [
      {
        id: 's1',
        prompt: richText('one'),
        response: { type: 'exact_input', acceptedAnswers: ['alpha'] },
      },
      {
        id: 's2',
        prompt: richText('two'),
        response: { type: 'exact_input', acceptedAnswers: ['beta'] },
      },
    ],
  }

  const allRecall: WalkthroughInteraction = {
    ...interaction,
    steps: [
      { id: 's1', prompt: richText('one'), response: { type: 'recall', answer: richText('a') } },
    ],
  }

  function state(partial: Partial<WalkthroughState>): WalkthroughState {
    return { ...initialWalkthroughState, ...partial }
  }

  it('is not ready until every step has been answered', () => {
    expect(walkthroughBehavior.isResponseReady(undefined, interaction)).toBe(false)
    expect(
      walkthroughBehavior.isResponseReady(
        state({ answers: { s1: { type: 'exact_input', value: 'alpha' } } }),
        interaction,
      ),
    ).toBe(false)
  })

  it('is ready once the last step is answered, which is what unlocks the one card rating', () => {
    expect(
      walkthroughBehavior.isResponseReady(
        state({
          answers: {
            s1: { type: 'exact_input', value: 'alpha' },
            s2: { type: 'exact_input', value: 'nope' },
          },
        }),
        interaction,
      ),
    ).toBe(true)
  })

  it('aggregates the per-step results into one partial-credit card result', () => {
    expect(
      walkthroughBehavior.autoGrade(
        interaction,
        state({ results: { s1: { correct: true }, s2: { correct: false } } }),
      ),
    ).toEqual({ correct: false, score: 0.5 })
    expect(
      walkthroughBehavior.autoGrade(
        interaction,
        state({ results: { s1: { correct: true }, s2: { correct: true } } }),
      ),
    ).toEqual({ correct: true, score: 1 })
  })

  it('returns null, not {correct:false}, when no step is objectively gradeable', () => {
    // The shell shows "Incorrect" and suggests Again for {correct:false}; an
    // all-recall walkthrough was never checked and must not get either.
    expect(walkthroughBehavior.autoGrade(allRecall, state({}))).toBeNull()
  })
})
