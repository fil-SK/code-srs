// Guards the workspace boundary this milestone introduced: the web app must
// reach the canonical contracts through @itera/core, and the src/types/*
// compatibility shims must be re-exports of that one module rather than copies
// of it.
//
// Identity is the assertion that matters. A shim that redefined richText, or a
// bundler/test resolver that loaded @itera/core twice, would still typecheck
// and still behave correctly in isolation - and would then silently give the
// two platforms two implementations of the same contract, which is the exact
// failure the shared package exists to prevent. Reference equality is the only
// check that catches it, and it can only be made at runtime.
import { describe, expect, it } from 'vitest'
import * as core from '@itera/core'
import { CARD_SCHEMA_VERSION as shimVersion, richText as shimRichText } from '@/types/card'

describe('@itera/core resolution', () => {
  it('resolves as a workspace package from the web app', () => {
    expect(typeof core.richText).toBe('function')
    expect(core.CARD_SCHEMA_VERSION).toBe(2)
  })

  it('is the same module instance the @/types shim re-exports', () => {
    expect(shimRichText).toBe(core.richText)
    expect(shimVersion).toBe(core.CARD_SCHEMA_VERSION)
  })

  it('still produces the unchanged RichContent shape', () => {
    expect(shimRichText('let x = 1')).toEqual({ format: 'markdown', value: 'let x = 1' })
  })
})
