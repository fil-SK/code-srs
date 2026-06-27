import { newId } from '@/lib/id'
import type { CardTypeDefinition } from '../../registry/types'
import { MatchingQuestion } from './Question'
import { MatchingAnswer } from './Answer'
import { MatchingEditor } from './Editor'
import { colKey, correctTarget, fixedValues, isFixed } from './columns'

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
  isComplete: (c) => {
    if (c.prompt.trim().length === 0 || c.pairs.length < 2) return false
    const cols = c.triple ? (['right', 'third'] as const) : (['right'] as const)
    // A fixed column needs at least two distinct option values to be useful.
    if (cols.some((col) => isFixed(c, col) && fixedValues(c, col).length < 2)) {
      return false
    }
    return c.pairs.every(
      (p) =>
        p.left.trim().length > 0 &&
        p.right.trim().length > 0 &&
        (!c.triple || (p.third?.trim().length ?? 0) > 0) &&
        cols.every(
          (col) =>
            !isFixed(c, col) ||
            fixedValues(c, col).includes(
              col === 'right' ? p.right : (p.third ?? ''),
            ),
        ),
    )
  },
  isResponseReady: (response, content) => {
    const assign = (response as Record<string, string> | undefined) ?? {}
    return content.pairs.every(
      (p) =>
        assign[colKey('right', p.id)] &&
        (!content.triple || assign[colKey('third', p.id)]),
    )
  },
  autoGrade: (content, response) => {
    const assign = (response as Record<string, string> | undefined) ?? {}
    const ok = content.pairs.every((p) => {
      if (assign[colKey('right', p.id)] !== correctTarget(content, 'right', p)) {
        return false
      }
      if (!content.triple) return true
      return assign[colKey('third', p.id)] === correctTarget(content, 'third', p)
    })
    return { correct: ok }
  },
  Question: MatchingQuestion,
  Answer: MatchingAnswer,
  Editor: MatchingEditor,
}
