import { richText, walkthroughBehavior } from '@itera/core'

import type { MobileWalkthroughPreviewViewModel } from '@/src/types/review'

const resizeStepId = 'resize-size'
const copyStepId = 'copy-buffer'
const returnStepId = 'return-ownership'

export const mobileWalkthroughPreviewFixture: MobileWalkthroughPreviewViewModel = {
  cardId: 'fixture-walkthrough-vector-buffer',
  interactionType: walkthroughBehavior.type,
  current: 6,
  total: 10,
  promptParts: [
    { text: 'Walk through what happens to the buffer as this function runs.', tone: 'plain' },
  ],
  scenarioParts: [
    { text: 'v', tone: 'code' },
    { text: ' arrives with capacity at least 3. Track ', tone: 'plain' },
    { text: 'v', tone: 'code' },
    { text: " and ", tone: 'plain' },
    { text: 'copy', tone: 'code' },
    { text: ' one step at a time.', tone: 'plain' },
  ],
  interaction: {
    type: walkthroughBehavior.type,
    scenario: richText('v arrives with capacity at least 3. Track v and copy one step at a time.'),
    code: {
      language: 'cpp',
      value: `std::vector<int> shrink_copy(std::vector<int> v) {
  v.resize(3);
  v.shrink_to_fit();
  std::vector<int> copy = v;
  return copy;
}`,
    },
    steps: [
      {
        id: resizeStepId,
        focus: [{ startLine: 2, endLine: 2 }],
        prompt: richText('After resize(3), what is v.size()?'),
        tip: richText('resize changes the logical size. Capacity is a separate property.'),
        explanation: richText('v has exactly three elements after resize(3), regardless of its prior capacity.'),
        response: { type: 'exact_input', acceptedAnswers: ['3', 'three'] },
      },
      {
        id: copyStepId,
        focus: [{ startLine: 3, endLine: 4 }],
        prompt: richText('After shrink_to_fit() and the copy, which statement is true?'),
        tip: richText('Separate capacity from ownership: copying a vector copies its elements into independent storage.'),
        explanation: richText('copy receives its own allocation. It never aliases the buffer owned by v.'),
        response: {
          type: 'multiple_choice',
          selectionMode: 'single',
          options: [
            {
              id: 'independent-copy',
              content: richText("copy's capacity equals its size (3), independent of v's original capacity."),
              correct: true,
            },
            {
              id: 'shared-buffer',
              content: richText("copy shares v's buffer because both hold the same elements."),
              correct: false,
            },
            {
              id: 'const-only',
              content: richText('shrink_to_fit() is a no-op unless v is a const reference.'),
              correct: false,
            },
          ],
        },
      },
      {
        id: returnStepId,
        focus: [{ startLine: 5, endLine: 5 }],
        prompt: richText('Who owns the returned buffer after this function completes?'),
        tip: richText('Think about returning by value, move construction, and copy elision.'),
        explanation: richText('The returned vector owns the allocation independently; v is destroyed when the function exits.'),
        response: {
          type: 'recall',
          answer: richText('The returned vector owns its buffer. It does not alias v, whose lifetime ends at function exit.'),
        },
      },
    ],
  },
  codeLines: [
    {
      number: 1,
      parts: [
        { text: 'std::vector<int>', tone: 'type' },
        { text: ' shrink_copy(', tone: 'plain' },
        { text: 'std::vector<int>', tone: 'type' },
        { text: ' v) {', tone: 'plain' },
      ],
    },
    { number: 2, parts: [{ text: '  v.resize(3);', tone: 'plain' }] },
    { number: 3, parts: [{ text: '  v.shrink_to_fit();', tone: 'plain' }] },
    {
      number: 4,
      parts: [
        { text: '  std::vector<int>', tone: 'type' },
        { text: ' copy = v;', tone: 'plain' },
      ],
    },
    {
      number: 5,
      parts: [
        { text: '  return', tone: 'keyword' },
        { text: ' copy;', tone: 'plain' },
      ],
    },
    { number: 6, parts: [{ text: '}', tone: 'plain' }] },
  ],
  stepPresentation: [
    {
      id: resizeStepId,
      promptParts: [
        { text: 'After ', tone: 'plain' },
        { text: 'resize(3)', tone: 'code' },
        { text: ', what is ', tone: 'plain' },
        { text: 'v.size()', tone: 'code' },
        { text: '?', tone: 'plain' },
      ],
      tipParts: [
        { text: 'resize', tone: 'code' },
        { text: ' changes logical size. Capacity is separate.', tone: 'plain' },
      ],
      explanationParts: [
        { text: 'v', tone: 'code' },
        { text: ' has exactly three elements after ', tone: 'plain' },
        { text: 'resize(3)', tone: 'code' },
        { text: '.', tone: 'plain' },
      ],
    },
    {
      id: copyStepId,
      promptParts: [
        { text: 'After ', tone: 'plain' },
        { text: 'shrink_to_fit()', tone: 'code' },
        { text: ' and the copy, which statement is true?', tone: 'plain' },
      ],
      tipParts: [
        { text: 'Track capacity and ownership separately. A vector copy gets independent storage.', tone: 'plain' },
      ],
      explanationParts: [
        { text: 'copy', tone: 'code' },
        { text: ' receives its own allocation. It never aliases the buffer owned by ', tone: 'plain' },
        { text: 'v', tone: 'code' },
        { text: '.', tone: 'plain' },
      ],
      optionParts: {
        'independent-copy': [
          { text: "copy's", tone: 'code' },
          { text: ' capacity equals its size (3), independent of ', tone: 'plain' },
          { text: "v's", tone: 'code' },
          { text: ' original capacity.', tone: 'plain' },
        ],
        'shared-buffer': [
          { text: 'copy', tone: 'code' },
          { text: ' shares ', tone: 'plain' },
          { text: "v's", tone: 'code' },
          { text: ' buffer because both hold the same elements.', tone: 'plain' },
        ],
        'const-only': [
          { text: 'shrink_to_fit()', tone: 'code' },
          { text: ' is a no-op unless ', tone: 'plain' },
          { text: 'v', tone: 'code' },
          { text: ' is a ', tone: 'plain' },
          { text: 'const', tone: 'code' },
          { text: ' reference.', tone: 'plain' },
        ],
      },
    },
    {
      id: returnStepId,
      promptParts: [
        { text: 'Who owns the returned buffer after this function completes?', tone: 'plain' },
      ],
      tipParts: [
        { text: 'Think about returning by value, move construction, and copy elision.', tone: 'plain' },
      ],
      explanationParts: [
        { text: 'The returned vector owns the allocation independently; ', tone: 'plain' },
        { text: 'v', tone: 'code' },
        { text: ' is destroyed when the function exits.', tone: 'plain' },
      ],
      recallAnswerParts: [
        { text: 'The returned vector owns its buffer. It does not alias ', tone: 'plain' },
        { text: 'v', tone: 'code' },
        { text: ', whose lifetime ends at function exit.', tone: 'plain' },
      ],
    },
  ],
  globalTipParts: [
    { text: 'Global tip: ', tone: 'plain' },
    { text: 'Track size, capacity, and ownership as three separate facts.', tone: 'code' },
  ],
  globalExplanationParts: [
    { text: 'Global explanation: ', tone: 'plain' },
    { text: 'resize', tone: 'code' },
    { text: ' changes size, ', tone: 'plain' },
    { text: 'shrink_to_fit', tone: 'code' },
    { text: ' requests tighter capacity, and copying establishes independent ownership.', tone: 'plain' },
  ],
  ratingIntervals: {
    1: '<1m',
    2: '6m',
    3: '10m',
    4: '8d',
  },
}
