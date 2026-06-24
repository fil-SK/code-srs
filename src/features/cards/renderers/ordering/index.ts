import { newId } from '@/lib/id'
import type { CardTypeDefinition } from '../../registry/types'
import { OrderingQuestion } from './Question'
import { OrderingAnswer } from './Answer'
import { OrderingEditor } from './Editor'

export const orderingDefinition: CardTypeDefinition<'ordering'> = {
  type: 'ordering',
  interactive: true,
  emptyContent: () => ({
    prompt: '',
    items: [
      { id: newId(), text: '' },
      { id: newId(), text: '' },
    ],
  }),
  isComplete: (c) =>
    c.prompt.trim().length > 0 &&
    c.items.length >= 2 &&
    c.items.every((i) => i.text.trim().length > 0),
  isResponseReady: (r) => Array.isArray(r) && r.length > 0,
  autoGrade: (content, response) => {
    const order = (response as string[] | undefined) ?? []
    const correct = content.items.map((i) => i.id)
    const ok =
      order.length === correct.length &&
      order.every((id, i) => id === correct[i])
    return { correct: ok }
  },
  Question: OrderingQuestion,
  Answer: OrderingAnswer,
  Editor: OrderingEditor,
}
