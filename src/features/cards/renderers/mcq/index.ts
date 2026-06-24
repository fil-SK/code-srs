import { newId } from '@/lib/id'
import type { CardTypeDefinition } from '../../registry/types'
import { McqQuestion } from './Question'
import { McqAnswer } from './Answer'
import { McqEditor } from './Editor'

export const mcqDefinition: CardTypeDefinition<'mcq'> = {
  type: 'mcq',
  interactive: true,
  emptyContent: () => ({
    prompt: '',
    options: [
      { id: newId(), text: '' },
      { id: newId(), text: '' },
    ],
    correct: [],
    multiple: false,
    explanation: '',
  }),
  isComplete: (c) =>
    c.prompt.trim().length > 0 &&
    c.options.length >= 2 &&
    c.options.every((o) => o.text.trim().length > 0) &&
    c.correct.length >= 1,
  isResponseReady: (r) => Array.isArray(r) && r.length > 0,
  autoGrade: (content, response) => {
    const selected = (response as string[] | undefined) ?? []
    const correct = content.correct
    const ok =
      selected.length === correct.length &&
      selected.every((id) => correct.includes(id))
    return { correct: ok }
  },
  Question: McqQuestion,
  Answer: McqAnswer,
  Editor: McqEditor,
}
