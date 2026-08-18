import { describe, expect, it } from 'vitest'
import type { MultipleChoiceInteraction } from '@/types/card'
import { gradeMultipleChoice } from './multipleChoice'

const single: MultipleChoiceInteraction = {
  type: 'multiple_choice',
  selectionMode: 'single',
  randomizeOptions: false,
  options: [
    { id: 'a', content: { format: 'markdown', value: 'A' }, correct: false },
    { id: 'b', content: { format: 'markdown', value: 'B' }, correct: true },
    { id: 'c', content: { format: 'markdown', value: 'C' }, correct: false },
  ],
}

const multi: MultipleChoiceInteraction = {
  ...single,
  selectionMode: 'multiple',
  options: [
    { id: 'a', content: { format: 'markdown', value: 'A' }, correct: true },
    { id: 'b', content: { format: 'markdown', value: 'B' }, correct: true },
    { id: 'c', content: { format: 'markdown', value: 'C' }, correct: false },
  ],
}

describe('gradeMultipleChoice', () => {
  it('correct when the exact correct set is selected (single)', () => {
    expect(gradeMultipleChoice(single, ['b']).correct).toBe(true)
    expect(gradeMultipleChoice(single, ['a']).correct).toBe(false)
    expect(gradeMultipleChoice(single, []).correct).toBe(false)
  })

  it('correct only for the exact correct set (multiple)', () => {
    expect(gradeMultipleChoice(multi, ['a', 'b']).correct).toBe(true)
    expect(gradeMultipleChoice(multi, ['a']).correct).toBe(false) // missed b
    expect(gradeMultipleChoice(multi, ['a', 'b', 'c']).correct).toBe(false) // extra c
  })

  it('categorizes selected-correct, selected-incorrect, and missed-correct', () => {
    const grade = gradeMultipleChoice(multi, ['a', 'c'])
    expect(grade.selectedCorrect).toEqual(['a'])
    expect(grade.selectedIncorrect).toEqual(['c'])
    expect(grade.missedCorrect).toEqual(['b'])
    expect(grade.correct).toBe(false)
  })
})
