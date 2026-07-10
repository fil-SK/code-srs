import { newId } from '@/lib/id'
import type { CardTypeDefinition } from '../../registry/types'
import { StoryQuestion } from './Question'
import { StoryAnswer } from './Answer'
import { StoryEditor } from './Editor'
import { isFinished } from './progress'

// A multi-step "story": shared context (code and/or image) plus an ordered list
// of steps the user walks through one at a time, revealing each step's answer.
// The whole story is one FSRS item, self-graded once at the end. It is marked
// interactive so the outer reveal/grade bar stays locked until the last step is
// revealed (see isResponseReady).
export const storyDefinition: CardTypeDefinition<'story'> = {
  type: 'story',
  interactive: true,
  reveal: 'slide',
  emptyContent: () => ({ steps: [{ id: newId(), prompt: '', answer: '' }] }),
  isComplete: (c) =>
    c.steps.length > 0 &&
    c.steps.every(
      (s) => s.prompt.trim().length > 0 && s.answer.trim().length > 0,
    ),
  isResponseReady: (response, content) => isFinished(content, response),
  Question: StoryQuestion,
  Answer: StoryAnswer,
  Editor: StoryEditor,
}
