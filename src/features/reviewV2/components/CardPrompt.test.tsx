// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { CardPrompt } from './CardPrompt'
import { isLongCardPrompt } from './promptLength'

describe('CardPrompt', () => {
  afterEach(() => cleanup())

  it('keeps ordinary prompts at the shared front-face size', () => {
    const { container } = render(<CardPrompt text="What is a declaration?" />)
    expect(container.firstElementChild?.className).toContain('text-2xl')
  })

  it('compacts only genuinely long prompts', () => {
    const longPrompt = 'A'.repeat(281)
    expect(isLongCardPrompt(longPrompt)).toBe(true)
    const { container } = render(<CardPrompt text={longPrompt} />)
    expect(container.firstElementChild?.className).toContain('text-xl')
  })

  it('treats more than six non-empty lines as long-form content', () => {
    expect(isLongCardPrompt('One\nTwo\nThree\nFour\nFive\nSix\nSeven')).toBe(true)
  })
})
