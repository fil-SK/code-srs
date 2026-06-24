import { newId } from '@/lib/id'
import type { CardTypeDefinition } from '../../registry/types'
import { MatchingQuestion } from './Question'
import { MatchingAnswer } from './Answer'
import { MatchingEditor } from './Editor'

export const matchingDefinition: CardTypeDefinition<'matching'> = {
  type: 'matching',
  interactive: true,
  emptyContent: () => ({
    prompt: '',
    pairs: [
      { id: newId(), left: '', right: '' },
      { id: newId(), left: '', right: '' },
    ],
  }),
  isComplete: (c) =>
    c.prompt.trim().length > 0 &&
    c.pairs.length >= 2 &&
    c.pairs.every((p) => p.left.trim().length > 0 && p.right.trim().length > 0),
  isResponseReady: (response, content) => {
    const assign = (response as Record<string, string> | undefined) ?? {}
    return content.pairs.every((p) => assign[p.id])
  },
  autoGrade: (content, response) => {
    const assign = (response as Record<string, string> | undefined) ?? {}
    const ok = content.pairs.every((p) => assign[p.id] === p.id)
    return { correct: ok }
  },
  Question: MatchingQuestion,
  Answer: MatchingAnswer,
  Editor: MatchingEditor,
}
