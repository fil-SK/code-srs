import type { CardTypeDefinition } from '../../registry/types'
import { BugFindingQuestion } from './Question'
import { BugFindingAnswer } from './Answer'
import { BugFindingEditor } from './Editor'

export const bugFindingDefinition: CardTypeDefinition<'bugFinding'> = {
  type: 'bugFinding',
  interactive: false,
  emptyContent: () => ({
    code: { language: 'cpp', code: '' },
    question: '',
    bugHint: '',
    explanation: '',
  }),
  isComplete: (c) =>
    c.code.code.trim().length > 0 && c.explanation.trim().length > 0,
  Question: BugFindingQuestion,
  Answer: BugFindingAnswer,
  Editor: BugFindingEditor,
}
