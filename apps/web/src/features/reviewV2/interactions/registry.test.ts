// The web interaction registry: six shared behaviors bound to six web Views,
// and a deliberate runtime failure for anything else.
//
// Two properties matter here and neither is about rendering. First, the
// registry must *bind* @itera/core's behavior objects rather than restate
// them: a web copy of autoGrade or isResponseReady would keep every test
// green while giving the two platforms different grading, which is the exact
// failure the split exists to prevent. Reference equality is the only check
// that catches it, and it can only be made at runtime - the same technique
// src/types/coreSurface.test.ts uses on the @/domain shims. Second, an
// unregistered type must still throw loudly; the registry is deliberately
// Partial rather than a total Record, so the compiler will not catch a missing
// seventh interaction and this is the net that does.
import { describe, expect, it } from 'vitest'
import {
  matchingBehavior,
  multipleChoiceBehavior,
  orderingBehavior,
  recallBehavior,
  walkthroughBehavior,
  writeCodeBehavior,
  type InteractionType,
} from '@itera/core'
import { getInteractionDefinition } from './registry'
import { RecallView } from './recall/RecallView'
import { MultipleChoiceView } from './multipleChoice/MultipleChoiceView'
import { WriteCodeView } from './writeCode/WriteCodeView'
import { OrderingView } from './ordering/OrderingView'
import { MatchingView } from './matching/MatchingView'
import { WalkthroughView } from './walkthrough/WalkthroughView'

const REGISTERED = [
  { type: 'recall', behavior: recallBehavior, View: RecallView },
  { type: 'multiple_choice', behavior: multipleChoiceBehavior, View: MultipleChoiceView },
  { type: 'write_code', behavior: writeCodeBehavior, View: WriteCodeView },
  { type: 'ordering', behavior: orderingBehavior, View: OrderingView },
  { type: 'matching', behavior: matchingBehavior, View: MatchingView },
  { type: 'walkthrough', behavior: walkthroughBehavior, View: WalkthroughView },
] as ReadonlyArray<{
  type: InteractionType
  // Structural, not InteractionBehavior<T>: the six `satisfies`-typed literals
  // have no common instantiation of that generic, and identity is all this
  // file asserts about them anyway.
  behavior: {
    interactive: boolean
    isResponseReady?: unknown
    autoGrade?: unknown
    widthFor?: unknown
  }
  View: unknown
}>

describe('the web interaction registry', () => {
  it('resolves all six interaction types', () => {
    for (const { type } of REGISTERED) {
      expect(() => getInteractionDefinition(type), type).not.toThrow()
    }
  })

  it('returns a definition whose type matches the key it was looked up by', () => {
    for (const { type } of REGISTERED) {
      expect(getInteractionDefinition(type).type).toBe(type)
    }
  })

  it('registers each type exactly once', () => {
    const types = REGISTERED.map((entry) => getInteractionDefinition(entry.type).type)
    expect(new Set(types).size).toBe(REGISTERED.length)
    expect(REGISTERED).toHaveLength(6)
  })

  it('attaches this platform’s own View to each type', () => {
    for (const { type, View } of REGISTERED) {
      expect(getInteractionDefinition(type).View, type).toBe(View)
    }
  })
})

describe('behavior is bound, never reimplemented', () => {
  it('carries the shared behavior functions by identity, not by copy', () => {
    for (const { type, behavior } of REGISTERED) {
      const definition = getInteractionDefinition(type)
      expect(definition.interactive, type).toBe(behavior.interactive)
      expect(definition.isResponseReady, `${type}.isResponseReady`).toBe(behavior.isResponseReady)
      expect(definition.autoGrade, `${type}.autoGrade`).toBe(behavior.autoGrade)
      expect(definition.widthFor, `${type}.widthFor`).toBe(behavior.widthFor)
    }
  })

  it('keeps Recall free of a grader on this platform too', () => {
    const recall = getInteractionDefinition('recall')
    expect(recall.autoGrade).toBeUndefined()
    expect(recall.isResponseReady).toBeUndefined()
  })
})

describe('an unregistered interaction type', () => {
  // Cast-only: no seventh interaction exists, and this test must not create
  // one. It stands in for the state the codebase is in for exactly as long as
  // it takes to add a type to the union and forget the registry entry.
  const UNSUPPORTED = 'diagram' as InteractionType

  it('throws, naming the type, instead of returning a fallback', () => {
    expect(() => getInteractionDefinition(UNSUPPORTED)).toThrow(/diagram/)
  })

  it('is not satisfied by any silent default, Recall included', () => {
    let resolved: unknown
    try {
      resolved = getInteractionDefinition(UNSUPPORTED)
    } catch {
      resolved = undefined
    }
    expect(resolved).toBeUndefined()
  })

  // Anti-vacuity: the throw above must be caused by the missing registration,
  // not by getInteractionDefinition being broken for everything. If the guard
  // were removed, the first test fails; if the guard threw unconditionally,
  // this one does.
  it('is the only case that throws - a registered type resolves normally', () => {
    expect(() => getInteractionDefinition('recall')).not.toThrow()
    expect(getInteractionDefinition('recall').View).toBe(RecallView)
  })
})
