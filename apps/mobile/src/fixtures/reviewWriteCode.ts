import { writeCodeBehavior } from '@itera/core'

import type { MobileWriteCodePreviewViewModel } from '@/src/types/review'

const acceptedAnswer = `int sum(const std::vector<int>& v) {
  int total = 0;
  for (const int& x : v) total += x;
  return total;
}`

export const mobileWriteCodePreviewFixture: MobileWriteCodePreviewViewModel = {
  cardId: 'fixture-write-code-vector-sum',
  interactionType: writeCodeBehavior.type,
  current: 5,
  total: 10,
  promptParts: [
    { text: 'Complete the function so it returns the sum of all elements in ', tone: 'plain' },
    { text: 'v', tone: 'code' },
    { text: '.', tone: 'plain' },
  ],
  languageLabel: 'C / C++',
  interaction: {
    type: writeCodeBehavior.type,
    language: 'cpp',
    starterCode: `int sum(const std::vector<int>& v) {
  // your code here

}`,
    editableRegion: { startLine: 2, endLine: 3 },
    acceptedAnswers: [acceptedAnswer],
    comparison: {
      trimOuterWhitespace: true,
      normalizeLineEndings: true,
      ignoreTrailingWhitespace: true,
      caseSensitive: true,
    },
  },
  expectedAnswerLines: [
    {
      number: 1,
      parts: [
        { text: 'int', tone: 'type' },
        { text: ' sum(', tone: 'plain' },
        { text: 'const', tone: 'keyword' },
        { text: ' std::vector<int>& v) {', tone: 'plain' },
      ],
    },
    {
      number: 2,
      parts: [
        { text: '  int', tone: 'type' },
        { text: ' total = ', tone: 'plain' },
        { text: '0', tone: 'number' },
        { text: ';', tone: 'plain' },
      ],
    },
    {
      number: 3,
      parts: [
        { text: '  for', tone: 'keyword' },
        { text: ' (', tone: 'plain' },
        { text: 'const', tone: 'keyword' },
        { text: ' int& x : v) total += x;', tone: 'plain' },
      ],
    },
    {
      number: 4,
      parts: [
        { text: '  return', tone: 'keyword' },
        { text: ' total;', tone: 'plain' },
      ],
    },
    { number: 5, parts: [{ text: '}', tone: 'plain' }] },
  ],
  explanationParts: [
    { text: 'Start the accumulator at ', tone: 'plain' },
    { text: '0', tone: 'code' },
    { text: ', then visit every element by ', tone: 'plain' },
    { text: 'const int&', tone: 'code' },
    { text: ' so the loop does not copy each value.', tone: 'plain' },
  ],
  ratingIntervals: {
    1: '<1m',
    2: '6m',
    3: '10m',
    4: '8d',
  },
}
