import type { CardTypeDefinition } from '../../registry/types'
import { CodeReadingQuestion } from './Question'
import { CodeReadingAnswer } from './Answer'
import { CodeReadingEditor } from './Editor'

export const codeReadingDefinition: CardTypeDefinition<'codeReading'> = {
  type: 'codeReading',
  interactive: false,
  emptyContent: () => ({
    code: { language: 'cpp', code: '' },
    question: '',
    answer: '',
  }),
  isComplete: (c) =>
    c.code.code.trim().length > 0 &&
    c.question.trim().length > 0 &&
    c.answer.trim().length > 0,
  Question: CodeReadingQuestion,
  Answer: CodeReadingAnswer,
  Editor: CodeReadingEditor,
}
