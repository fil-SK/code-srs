import { describe, expect, it } from 'vitest'
import { emptyDeckForm, validateDeckForm } from './deckForm'

describe('validateDeckForm', () => {
  it('refuses an empty name', () => {
    expect(validateDeckForm(emptyDeckForm())).toEqual({
      canSave: false,
      errors: ['Deck name is required.'],
    })
  })

  it('refuses a whitespace-only name, which is what web already did', () => {
    expect(validateDeckForm({ name: '   ', description: '' }).canSave).toBe(false)
  })

  it('accepts a name with content, description or not', () => {
    expect(validateDeckForm({ name: 'Compilers', description: '' })).toEqual({
      canSave: true,
      errors: [],
    })
    expect(validateDeckForm({ name: 'Compilers', description: 'SSA, IR' }).canSave).toBe(true)
  })

  it('does not require a description', () => {
    expect(validateDeckForm({ name: 'x', description: '' }).errors).toEqual([])
  })
})
