import { multipleChoiceBehavior, richText } from '@itera/core'

import type { MobileMultipleChoicePreviewViewModel } from '@/src/types/review'

const options = [
  {
    id: 'faster',
    content: richText('They run faster than non-const member functions.'),
    correct: false,
  },
  {
    id: 'const-object',
    content: richText('They can be called on a const object.'),
    correct: true,
  },
  {
    id: 'non-const-call',
    content: richText('They cannot call non-const member functions on *this*.'),
    correct: true,
  },
  {
    id: 'non-mutable',
    content: richText('They cannot modify non-mutable data members.'),
    correct: true,
  },
]

export const mobileMultipleChoicePreviewFixture: MobileMultipleChoicePreviewViewModel = {
  cardId: 'fixture-multiple-choice-const-members',
  interactionType: multipleChoiceBehavior.type,
  current: 4,
  total: 10,
  promptParts: [
    { text: 'Which of these are true about ', tone: 'plain' },
    { text: 'const', tone: 'code' },
    { text: ' member functions in C++?', tone: 'plain' },
  ],
  interaction: {
    type: multipleChoiceBehavior.type,
    selectionMode: 'multiple',
    randomizeOptions: true,
    options,
  },
  presentedOptionIds: options.map((option) => option.id),
  optionParts: {
    faster: [
      { text: 'They run faster than non-', tone: 'plain' },
      { text: 'const', tone: 'code' },
      { text: ' member functions.', tone: 'plain' },
    ],
    'const-object': [
      { text: 'They can be called on a ', tone: 'plain' },
      { text: 'const', tone: 'code' },
      { text: ' object.', tone: 'plain' },
    ],
    'non-const-call': [
      { text: 'They cannot call non-', tone: 'plain' },
      { text: 'const', tone: 'code' },
      { text: ' member functions on ', tone: 'plain' },
      { text: '*this*', tone: 'code' },
      { text: '.', tone: 'plain' },
    ],
    'non-mutable': [
      { text: 'They cannot modify non-', tone: 'plain' },
      { text: 'mutable', tone: 'code' },
      { text: ' data members.', tone: 'plain' },
    ],
  },
  ratingIntervals: {
    1: '<1m',
    2: '6m',
    3: '10m',
    4: '8d',
  },
}
