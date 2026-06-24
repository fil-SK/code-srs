import { matchesAnySolution } from '@/domain/grading/normalize'
import type { CardTypeDefinition } from '../../registry/types'
import { CodeCompletionQuestion } from './Question'
import { CodeCompletionAnswer } from './Answer'
import { CodeCompletionEditor } from './Editor'

export const codeCompletionDefinition: CardTypeDefinition<'codeCompletion'> = {
  type: 'codeCompletion',
  interactive: true,
  emptyContent: () => ({
    scaffold: { language: 'cpp', code: '' },
    solutions: [''],
    validation: { mode: 'normalizedMatch', ignoreWhitespace: true, caseSensitive: false },
    explanation: '',
  }),
  isComplete: (c) =>
    c.scaffold.code.trim().length > 0 &&
    c.solutions.length >= 1 &&
    c.solutions.every((s) => s.trim().length > 0),
  isResponseReady: (r) => typeof r === 'string' && r.trim().length > 0,
  autoGrade: (content, response) => {
    if (content.validation.mode !== 'normalizedMatch') return null // self-graded
    const answer = (response as string | undefined) ?? ''
    if (!answer.trim()) return { correct: false }
    return {
      correct: matchesAnySolution(answer, content.solutions, content.validation),
    }
  },
  Question: CodeCompletionQuestion,
  Answer: CodeCompletionAnswer,
  Editor: CodeCompletionEditor,
}
