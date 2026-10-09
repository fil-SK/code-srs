import { CARD_SCHEMA_VERSION, initialSchedulingState, richText, type Card, type CardInteraction, type InteractionType } from '@fliptap/core'

function sample(prompt: string, interaction: CardInteraction, explanation?: string): Card {
  return {
    id: `about-${interaction.type}`, schemaVersion: CARD_SCHEMA_VERSION, deckId: 'about-samples',
    prompt: richText(prompt), interaction, tags: [], createdAt: 0, updatedAt: 0,
    suspended: false, scheduling: initialSchedulingState(0),
    ...(explanation ? { explanation: richText(explanation) } : {}),
  }
}

// These fixtures never enter the repository; trying a card records no review.
export const sampleCards: Record<InteractionType, Card> = {
  recall: sample('Why does binary search require sorted data?', {
    type: 'recall',
    answer: richText('Sorting lets each comparison rule out half the remaining elements. If the middle value is too small, the target can only be to its right; if it is too large, the target can only be to its left.'),
  }),
  multiple_choice: sample('Which data structure follows last in, first out (LIFO)?', {
    type: 'multiple_choice', selectionMode: 'single', randomizeOptions: false,
    options: [
      { id: 'queue', content: richText('Queue'), correct: false },
      { id: 'stack', content: richText('Stack'), correct: true },
      { id: 'set', content: richText('Set'), correct: false },
    ],
  }, 'A stack removes the most recently added element first. A queue follows first in, first out.'),
  write_code: sample('Write a Python function that returns the square of n.', {
    type: 'write_code', language: 'python', starterCode: 'def square(n):\n    ',
    acceptedAnswers: ['def square(n):\n    return n * n', 'def square(n):\n    return n ** 2'],
    comparison: { trimOuterWhitespace: true, normalizeLineEndings: true, ignoreTrailingWhitespace: true, caseSensitive: true },
  }, 'Multiply n by itself, or use n ** 2. This example compares your text with accepted answers; it does not execute code.'),
  ordering: sample('Put these compiler stages in order.', {
    type: 'ordering', randomize: false,
    items: [
      { id: 'c-lex', content: richText('Lexical analysis: source text to tokens') },
      { id: 'a-parse', content: richText('Parsing: tokens to a syntax tree') },
      { id: 'b-check', content: richText('Semantic analysis: check names and types') },
    ], correctOrder: ['c-lex', 'a-parse', 'b-check'],
  }, 'A compiler identifies tokens, builds their structure, then checks whether that structure makes semantic sense.'),
  matching: sample('Match each data structure to its behavior.', {
    type: 'matching', columns: [
      { id: 'structure', label: 'Structure', items: [
        { id: 'stack', content: richText('Stack') },
        { id: 'queue', content: richText('Queue') },
        { id: 'set', content: richText('Set') },
      ] },
      { id: 'behavior', label: 'Behavior', items: [
        { id: 'unique', content: richText('Unique elements') },
        { id: 'lifo', content: richText('Last in, first out') },
        { id: 'fifo', content: richText('First in, first out') },
      ] },
    ], relationships: [
      { structure: 'stack', behavior: 'lifo' },
      { structure: 'queue', behavior: 'fifo' },
      { structure: 'set', behavior: 'unique' },
    ],
  }),
  walkthrough: sample('Trace a binary search.', {
    type: 'walkthrough', scenario: richText('Find 9 in the sorted array [1, 3, 5, 7, 9]. Use zero-based indices and round the midpoint down.'),
    steps: [
      { id: 'middle', prompt: richText('Start with low = 0 and high = 4. What value is at the midpoint?'),
        response: { type: 'exact_input', acceptedAnswers: ['5'] },
        explanation: richText('The midpoint is index 2, which holds 5.') },
      { id: 'half', prompt: richText('5 is smaller than 9. Which half should you search next?'),
        response: { type: 'multiple_choice', selectionMode: 'single', options: [
          { id: 'left', content: richText('Left half'), correct: false },
          { id: 'right', content: richText('Right half'), correct: true },
        ] }, explanation: richText('Move low to index 3. The target must be to the right of 5.') },
    ],
  }, 'Each comparison narrows the search range. Repeat until you find the target or the range is empty.'),
}
