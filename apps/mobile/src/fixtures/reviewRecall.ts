import { recallBehavior } from '@itera/core'

import type { MobileRecallPreviewViewModel } from '@/src/types/review'

export const mobileRecallPreviewFixture: MobileRecallPreviewViewModel = {
  cardId: 'fixture-recall-std-move',
  interactionType: recallBehavior.type,
  current: 1,
  total: 10,
  prompt: {
    lead: 'What does ',
    inlineCode: 'std::move',
    tail: ' actually do at runtime?',
    followLead: 'After this line runs, what can you say about ',
    followCode: 'a',
    followTail: '?',
  },
  codeLanguage: 'cpp',
  codeLines: [
    {
      number: 1,
      parts: [
        { text: 'std::vector<int>', tone: 'type' },
        { text: ' a = {1, 2, 3};', tone: 'plain' },
      ],
    },
    {
      number: 2,
      parts: [
        { text: 'std::vector<int>', tone: 'type' },
        { text: ' b = ', tone: 'plain' },
        { text: 'std::move', tone: 'accent' },
        { text: '(a);', tone: 'plain' },
      ],
    },
  ],
  answer: {
    lead: '',
    inlineCode: 'std::move',
    tail: ' does not move anything by itself.',
    detail:
      'It casts a to an xvalue, enabling the move constructor used to create b. Afterwards, a is still valid, but its contents are in a valid yet unspecified state.',
  },
  tip: {
    leadCode: 'std::move',
    text: ' is just a cast. Ask yourself: does casting to an rvalue change any bytes in memory?',
  },
  ratingIntervals: {
    1: '<1m',
    2: '6m',
    3: '10m',
    4: '8d',
  },
}
