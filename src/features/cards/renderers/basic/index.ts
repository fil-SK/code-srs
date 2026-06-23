import type { CardTypeDefinition } from '../../registry/types'
import { BasicQuestion } from './Question'
import { BasicAnswer } from './Answer'
import { BasicEditor } from './Editor'

export const basicDefinition: CardTypeDefinition<'basic'> = {
  type: 'basic',
  interactive: false,
  emptyContent: () => ({ front: '', back: '' }),
  isComplete: (c) => c.front.trim().length > 0 && c.back.trim().length > 0,
  Question: BasicQuestion,
  Answer: BasicAnswer,
  Editor: BasicEditor,
}
