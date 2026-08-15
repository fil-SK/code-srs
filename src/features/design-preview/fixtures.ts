import { newId } from '@/lib/id'
import type {
  CardV2,
  MatchingInteraction,
  MultipleChoiceInteraction,
  OrderingInteraction,
  RecallInteraction,
  WalkthroughInteraction,
  WriteCodeInteraction,
} from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'

// Every fixture below is typed as `CardV2 & { interaction: <SpecificType> }`,
// not plain `CardV2` - ReviewSessionScreen's `card` prop is that same
// intersection, generic over the interaction type. A plain `CardV2` has
// `interaction: CardInteraction` (the full 6-member union), which is not
// assignable to a single narrowed member, so passing an unnarrowed fixture
// only ever typechecked by accident of tsc -b's incremental cache never
// re-checking these call sites - `npm run build` from a clean state catches
// it. See docs/itera-decisions.md.

// Representative Recall content for /design-preview/review/recall: real
// Markdown (bold/italic/inline code) plus a formatted C++ fenced code block,
// so the preview exercises the same rendering path real content will use.
export const recallFixture: CardV2 & { interaction: RecallInteraction } = {
  id: 'preview-recall-1',
  schemaVersion: CARD_V2_SCHEMA_VERSION,
  deckId: 'preview-deck',
  prompt: richText(
    'What does `std::move` actually *do* at runtime?\n\n' +
      '```cpp\n' +
      'std::vector<int> a = {1, 2, 3};\n' +
      'std::vector<int> b = std::move(a);\n' +
      '```\n\n' +
      'After this line runs, what can you say about `a`?',
  ),
  tip: richText(
    '`std::move` is just a cast. Ask yourself: does casting a value change any bytes in memory?',
  ),
  explanation: richText(
    "Because `std::move` performs no work itself, the *actual* transfer happens inside `vector`'s move constructor, which is free to leave `a` in an unspecified-but-valid state — typically empty, since that's the cheapest thing to do with a moved-from vector.",
  ),
  interaction: {
    type: 'recall',
    authoringPreset: 'code_reading',
    answer: richText(
      "`std::move(a)` doesn't move anything by itself — it's an unconditional cast to an rvalue reference, equivalent to `static_cast<std::vector<int>&&>(a)`. The **actual** move happens when that rvalue reference binds to `vector`'s move constructor, which steals `a`'s internal buffer pointer instead of copying it. After the call, `a` is left in a *valid but unspecified* state (empty, for every major `std::vector` implementation) — you may assign to it or let it be destroyed, but must not assume anything about its contents.",
    ),
  },
  tags: ['cpp', 'move-semantics'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Representative Multiple Choice content for /design-preview/review/multiple-choice.
// Multi-select, so the "select all that apply" hint and the missed/incorrect
// feedback states all get exercised.
export const multipleChoiceFixture: CardV2 & { interaction: MultipleChoiceInteraction } = {
  id: 'preview-mcq-1',
  schemaVersion: CARD_V2_SCHEMA_VERSION,
  deckId: 'preview-deck',
  prompt: richText(
    'Which of these are true about `const` member functions in C++?',
  ),
  explanation: richText(
    'A `const` member function promises not to modify the observable state of the object through `this`. `mutable` members are the escape hatch for internal state (like a cache) that legitimately needs to change even from a `const` call.',
  ),
  interaction: {
    type: 'multiple_choice',
    selectionMode: 'multiple',
    randomizeOptions: true,
    options: [
      {
        id: newId(),
        content: richText('They cannot modify non-`mutable` data members.'),
        correct: true,
      },
      {
        id: newId(),
        content: richText('They can be called on a `const` object.'),
        correct: true,
      },
      {
        id: newId(),
        content: richText('They cannot call non-`const` member functions on `*this`.'),
        correct: true,
      },
      {
        id: newId(),
        content: richText('They run faster than non-`const` member functions.'),
        correct: false,
      },
    ],
  },
  tags: ['cpp', 'const-correctness'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Representative Write Code content for /design-preview/review/write-code.
export const writeCodeFixture: CardV2 & { interaction: WriteCodeInteraction } = {
  id: 'preview-write-code-1',
  schemaVersion: CARD_V2_SCHEMA_VERSION,
  deckId: 'preview-deck',
  prompt: richText(
    'Complete the function so it returns the sum of all elements in `v`.',
  ),
  tip: richText('A range-based `for` loop keeps this short and hard to get wrong.'),
  explanation: richText(
    'Accumulating by reference to `const int&` avoids copying each element; starting `sum` at `0` (not left uninitialized) matters just as much as the loop itself.',
  ),
  interaction: {
    type: 'write_code',
    language: 'cpp',
    starterCode:
      'int sum(const std::vector<int>& v) {\n    // your code here\n}\n',
    acceptedAnswers: [
      'int sum(const std::vector<int>& v) {\n    int total = 0;\n    for (const int& x : v) total += x;\n    return total;\n}',
      'int sum(const std::vector<int>& v) {\n    int total = 0;\n    for (int x : v) {\n        total += x;\n    }\n    return total;\n}',
    ],
    comparison: {
      trimOuterWhitespace: true,
      normalizeLineEndings: true,
      ignoreTrailingWhitespace: true,
      caseSensitive: true,
    },
  },
  tags: ['cpp', 'algorithms'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Representative Ordering content for /design-preview/review/ordering.
export const orderingFixture: CardV2 & { interaction: OrderingInteraction } = {
  id: 'preview-ordering-1',
  schemaVersion: CARD_V2_SCHEMA_VERSION,
  deckId: 'preview-deck',
  prompt: richText(
    'Put these steps in order for what happens when `push_back` triggers a `std::vector` reallocation.',
  ),
  explanation: richText(
    'The old buffer must stay valid until every element has been moved out of it, and the new elements only go in once the old ones are gone — reversing any of these steps either loses data or leaves the vector in an inconsistent state mid-operation.',
  ),
  interaction: (() => {
    const steps = [
      'Check whether `size() == capacity()`',
      'Allocate a new, larger buffer',
      'Move-construct the existing elements into the new buffer',
      'Destroy the elements in the old buffer and deallocate it',
      'Construct the new element at the end of the new buffer',
    ].map((value) => ({ id: newId(), content: richText(value) }))
    return {
      type: 'ordering' as const,
      randomize: true,
      items: steps,
      correctOrder: steps.map((s) => s.id),
    }
  })(),
  tags: ['cpp', 'vector', 'reallocation'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Representative Matching content for /design-preview/review/matching.
// Deliberately three-part with a fixed shared-value column (not the
// two-column MVP case) so the preview actually exercises the richer schema
// the V2 model preserves, per docs/itera-decisions.md.
const containerVector = newId()
const containerList = newId()
const containerDeque = newId()
const layoutContiguous = newId()
const layoutNodeBased = newId()
const layoutChunked = newId()
const randomAccessYes = newId()
const randomAccessNo = newId()

const matchingInteraction: MatchingInteraction = {
  type: 'matching',
  columns: [
    {
      id: 'container',
      label: 'Container',
      items: [
        { id: containerVector, content: richText('`std::vector`') },
        { id: containerList, content: richText('`std::list`') },
        { id: containerDeque, content: richText('`std::deque`') },
      ],
    },
    {
      id: 'layout',
      label: 'Memory layout',
      items: [
        { id: layoutContiguous, content: richText('One contiguous buffer') },
        { id: layoutNodeBased, content: richText('Doubly-linked nodes') },
        { id: layoutChunked, content: richText('Fixed-size chunks') },
      ],
    },
    {
      id: 'randomAccess',
      label: 'O(1) random access?',
      fixed: true,
      items: [
        { id: randomAccessYes, content: richText('Yes') },
        { id: randomAccessNo, content: richText('No') },
      ],
    },
  ],
  relationships: [
    { container: containerVector, layout: layoutContiguous, randomAccess: randomAccessYes },
    { container: containerList, layout: layoutNodeBased, randomAccess: randomAccessNo },
    { container: containerDeque, layout: layoutChunked, randomAccess: randomAccessYes },
  ],
}

export const matchingFixture: CardV2 & { interaction: MatchingInteraction } = {
  id: 'preview-matching-1',
  schemaVersion: CARD_V2_SCHEMA_VERSION,
  deckId: 'preview-deck',
  prompt: richText('Match each container to its memory layout and random-access guarantee.'),
  explanation: richText(
    '`deque` is the one people get wrong: it\'s chunked, not contiguous, but it still gives O(1) random access via an internal map of chunk pointers.',
  ),
  interaction: matchingInteraction,
  tags: ['cpp', 'containers'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

// Representative Walkthrough content for /design-preview/review/walkthrough.
// Exercises multi-range highlighting (step 2 highlights two disjoint lines)
// and all three MVP step-response types (recall, multiple_choice, exact_input).
const walkthroughCode =
  'std::vector<int> shrink_copy(std::vector<int> v) {\n' +
  '    v.resize(3);\n' +
  '    v.shrink_to_fit();\n' +
  '    std::vector<int> copy = v;\n' +
  '    return copy;\n' +
  '}\n'

export const walkthroughFixture: CardV2 & { interaction: WalkthroughInteraction } = {
  id: 'preview-walkthrough-1',
  schemaVersion: CARD_V2_SCHEMA_VERSION,
  deckId: 'preview-deck',
  prompt: richText('Walk through what happens to the buffer as this function runs.'),
  explanation: richText(
    'Three different buffers are involved: `v`\'s original (capacity >= 3), `v`\'s shrunk buffer (capacity == 3) after `shrink_to_fit`, and `copy`\'s own freshly-allocated buffer — the copy constructor never reuses `v`\'s storage.',
  ),
  interaction: {
    type: 'walkthrough',
    scenario: richText(
      "`v` arrives with some capacity >= 3. Step through each line and reason about `v`'s and `copy`'s buffers.",
    ),
    code: { language: 'cpp', value: walkthroughCode },
    steps: [
      {
        id: newId(),
        focus: [{ startLine: 2, endLine: 2 }],
        prompt: richText('What does `v.resize(3)` do to its size and capacity?'),
        tip: richText('Separate `size()` from `capacity()` before answering.'),
        explanation: richText(
          '`resize(3)` destroys excess elements, but reducing size alone does not release the allocation.',
        ),
        response: {
          type: 'recall',
          answer: richText(
            '`size()` becomes 3 (extra elements are destroyed). `capacity()` is **unchanged** — `resize` to a smaller size never reallocates or shrinks the buffer.',
          ),
        },
      },
      {
        id: newId(),
        focus: [
          { startLine: 3, endLine: 3 },
          { startLine: 4, endLine: 4 },
        ],
        prompt: richText(
          'After `shrink_to_fit()` (line 3) and the copy (line 4), which statement is true?',
        ),
        tip: richText('The copy constructor owns its destination storage.'),
        explanation: richText(
          '`copy` receives its own allocation; it never aliases the buffer owned by `v`.',
        ),
        response: {
          type: 'multiple_choice',
          selectionMode: 'single',
          options: [
            {
              id: newId(),
              content: richText(
                "`copy`'s capacity equals its size (3), independent of `v`'s original capacity.",
              ),
              correct: true,
            },
            {
              id: newId(),
              content: richText("`copy` shares `v`'s buffer, since both hold the same elements."),
              correct: false,
            },
            {
              id: newId(),
              content: richText("`shrink_to_fit()` is a no-op unless `v` is a `const` reference."),
              correct: false,
            },
          ],
        },
      },
      {
        id: newId(),
        focus: [{ startLine: 4, endLine: 5 }],
        prompt: richText(
          'What is the name of the operation that produces `copy` from `v` on line 4?',
        ),
        tip: richText('Look at the source expression: `v` is an lvalue.'),
        explanation: richText('Initializing a new vector from the lvalue `v` invokes copy construction.'),
        response: {
          type: 'exact_input',
          acceptedAnswers: ['copy construction', 'copy constructor'],
        },
      },
    ],
  },
  tags: ['cpp', 'vector', 'walkthrough'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
