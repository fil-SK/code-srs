import {
  matchingBehavior,
  multipleChoiceBehavior,
  orderingBehavior,
  recallBehavior,
  walkthroughBehavior,
  writeCodeBehavior,
  type InteractionType,
} from '@itera/core'

import { nativeInteractionFor, nativeInteractionRegistry } from './registry'

// Asserts the binding by reference, the same way web's registry test does.
//
// A native View that re-implemented `isResponseReady` or `autoGrade` would look
// perfectly reasonable in review and would silently teach the learner something
// different from what web teaches. Comparing function identity is what makes
// that impossible to do accidentally.

const behaviors = {
  recall: recallBehavior,
  multiple_choice: multipleChoiceBehavior,
  write_code: writeCodeBehavior,
  ordering: orderingBehavior,
  matching: matchingBehavior,
  walkthrough: walkthroughBehavior,
} as const

describe('the native interaction registry', () => {
  it('registers all six interaction types', () => {
    expect(Object.keys(nativeInteractionRegistry).sort()).toEqual(Object.keys(behaviors).sort())
  })

  it.each(Object.keys(behaviors) as InteractionType[])(
    'binds %s to the shared behavior by reference',
    (type) => {
      const definition = nativeInteractionFor(type)
      const behavior = behaviors[type as keyof typeof behaviors]

      expect(definition.type).toBe(behavior.type)
      expect(definition.interactive).toBe(behavior.interactive)
      expect(definition.isResponseReady).toBe(
        (behavior as { isResponseReady?: unknown }).isResponseReady,
      )
      expect(definition.autoGrade).toBe((behavior as { autoGrade?: unknown }).autoGrade)
      expect(definition.widthFor).toBe((behavior as { widthFor?: unknown }).widthFor)
    },
  )

  it('gives every type a View', () => {
    for (const type of Object.keys(behaviors) as InteractionType[]) {
      expect(typeof nativeInteractionFor(type).View).toBe('function')
    }
  })

  it('fails loudly for a type with no registered View', () => {
    expect(() => nativeInteractionFor('a_seventh_type' as InteractionType)).toThrow(
      /No native Review View is registered/,
    )
  })

  it('keeps Recall self-graded, with nothing to check', () => {
    const recall = nativeInteractionFor('recall')
    expect(recall.interactive).toBe(false)
    expect(recall.autoGrade).toBeUndefined()
    expect(recall.isResponseReady).toBeUndefined()
  })

  it('asks for the wide surface only where Matching needs it', () => {
    const matching = nativeInteractionFor('matching')
    expect(matching.widthFor).toBe(matchingBehavior.widthFor)
  })
})
