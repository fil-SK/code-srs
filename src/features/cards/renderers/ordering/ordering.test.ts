import { describe, expect, it } from 'vitest'
import type { OrderingContent } from '@/types'
import { orderingDefinition } from './index'

const content: OrderingContent = {
  prompt: 'order',
  items: [
    { id: 'a', text: '1' },
    { id: 'b', text: '2' },
    { id: 'c', text: '3' },
  ],
}

const grade = (response: string[]) =>
  orderingDefinition.autoGrade!(content, response)

describe('ordering autoGrade', () => {
  it('correct only for the exact canonical order', () => {
    expect(grade(['a', 'b', 'c'])?.correct).toBe(true)
    expect(grade(['a', 'c', 'b'])?.correct).toBe(false)
    expect(grade(['c', 'b', 'a'])?.correct).toBe(false)
  })

  it('incomplete order is incorrect', () => {
    expect(grade(['a', 'b'])?.correct).toBe(false)
    expect(grade([])?.correct).toBe(false)
  })
})

describe('ordering isComplete', () => {
  it('needs a prompt and 2+ filled steps', () => {
    expect(orderingDefinition.isComplete(content)).toBe(true)
    expect(orderingDefinition.isComplete({ ...content, prompt: '' })).toBe(false)
    expect(
      orderingDefinition.isComplete({
        ...content,
        items: [{ id: 'a', text: '1' }, { id: 'b', text: '' }],
      }),
    ).toBe(false)
  })
})
