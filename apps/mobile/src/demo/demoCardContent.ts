import { richText, type CardInteraction, type ID } from '@itera/core'

import type { DemoSchedulingSeed } from './demoScheduling'

// The demo workspace's card content: eighteen real, reviewable Itera cards.
//
// M-DEMO-1 gave each demo card a prompt string and a type so the Library could
// list it. That is not enough to review one: a session needs the interaction
// payload the learner actually answers, and the scheduling state the shared
// FSRS scheduler advances. Both are authored here.
//
// Every prompt, id, deck assignment and tag is carried over from M-DEMO-1
// unchanged, because those numbers are already device-verified on Library,
// Today and Progress. Only content and scheduling are added.
//
// The prose uses Itera's real text syntax - inline code, bold, italic and
// fenced blocks - rather than plain strings, so the native renderer is
// exercised by the demo itself and not only by its tests. Prompts carry markers
// too; the deck list flattens them through core's stripInlineMarkers.
//
// This is deterministic demo content. It is not production data, not synced,
// and not a Repository - see DemoWorkspaceProvider.

export interface DemoCardSeed {
  id: ID
  deckId: ID
  prompt: string
  tip?: string
  explanation?: string
  tag: string
  interaction: CardInteraction
  scheduling: DemoSchedulingSeed
  /** Authoring date, as a day offset from the demo epoch. */
  createdDaysAgo: number
}

// Every card is authored in the one state a card can honestly be authored in:
// New. A card that has seeded history in demoReviewHistory.ts is then advanced
// by replaying that history through the shared FSRS scheduler, and it *takes*
// the state the replay leaves it in.
//
// There is deliberately no helper for authoring a mature or learning card. Two
// of those used to exist, and they were the bug: a card could claim to be in
// learning while its own most recent ReviewLog said it had graduated. A state
// nobody can write down is a state that cannot contradict the history.
const fresh = (offsetDays: number): DemoSchedulingSeed => ({
  state: 'new',
  dueOffsetDays: offsetDays,
  reps: 0,
  lapses: 0,
  stability: 0,
  difficulty: 0,
  lastReviewDaysAgo: null,
})

// The pre-history state of a card the demo has reviewed. Uniform on purpose:
// the replay overwrites it, so nothing may depend on this number and it cannot
// drift out of step with the history that follows it.
const introducedBeforeHistory = (): DemoSchedulingSeed => fresh(-30)

const CODE_COMPARISON = {
  trimOuterWhitespace: true,
  normalizeLineEndings: true,
  ignoreTrailingWhitespace: true,
  caseSensitive: true,
} as const

export const DEMO_CARD_SEEDS: DemoCardSeed[] = [
  // ---- Modern C++ & Memory ------------------------------------------------
  {
    id: 'fixture-card-value-categories',
    deckId: 'fixture-modern-cpp',
    prompt: 'An expression is classified as an lvalue, xvalue, or prvalue based on…',
    tip: 'Two independent yes/no questions, not one sliding scale.',
    tag: 'value-categories',
    createdDaysAgo: 88,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'recall',
      answer: richText(
        'Two independent properties: **identity** and **movability**.\n\n' +
          'An expression with identity that cannot be moved from is an *lvalue*. ' +
          'One with identity that can be moved from is an *xvalue*. ' +
          'One with no identity at all is a *prvalue*.\n\n' +
          '```cpp\nstd::vector<int> a = {1, 2, 3};\nstd::vector<int> b = std::move(a);\n```\n\n' +
          '`a` is an lvalue, `std::move(a)` is an xvalue, and `{1, 2, 3}` is a prvalue.',
      ),
    },
  },
  {
    id: 'fixture-card-ownership-trace',
    deckId: 'fixture-modern-cpp',
    prompt: 'Trace the ownership and lifetime in this move sequence',
    tip: 'Follow the buffer, not the variable name.',
    explanation:
      'A moved-from `std::vector` is left in a valid but unspecified state. The standard ' +
      'guarantees you may destroy it or assign to it; it does not guarantee what `size()` returns.',
    tag: 'memory',
    createdDaysAgo: 84,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'walkthrough',
      scenario: richText(
        'Two vectors, one heap buffer. Work out where the allocation lives after each line.',
      ),
      code: {
        language: 'cpp',
        value:
          'std::vector<int> a = {1, 2, 3};\n' +
          'std::vector<int> b = std::move(a);\n' +
          'a.push_back(9);\n' +
          'return b.size();',
      },
      steps: [
        {
          id: 'step-owner',
          focus: [{ startLine: 2, endLine: 2 }],
          prompt: richText('After line 2, which variable owns the original heap buffer?'),
          tip: richText('`std::move` is only a cast; the move constructor does the work.'),
          response: { type: 'exact_input', acceptedAnswers: ['b'] },
        },
        {
          id: 'step-state',
          focus: [{ startLine: 3, endLine: 3 }],
          prompt: richText('Is line 3 well-defined?'),
          explanation: richText(
            '`push_back` has no precondition on the container contents, so it is safe on a ' +
              'moved-from vector - unlike `front()`, which does have one.',
          ),
          response: {
            type: 'multiple_choice',
            selectionMode: 'single',
            options: [
              {
                id: 'defined',
                content: richText('Yes - `push_back` has no precondition on the contents'),
                correct: true,
              },
              { id: 'ub', content: richText('No - it is undefined behaviour'), correct: false },
              { id: 'crash', content: richText('No - it always throws'), correct: false },
            ],
          },
        },
        {
          id: 'step-size',
          focus: [{ startLine: 4, endLine: 4 }],
          prompt: richText('What does `b.size()` return, and why can you be sure?'),
          response: {
            type: 'recall',
            answer: richText(
              '`3`. The move transferred the buffer and its size to `b`; only the *source* of a ' +
                'move is left unspecified, never the destination.',
            ),
          },
        },
      ],
    },
  },
  {
    id: 'fixture-card-raii',
    deckId: 'fixture-modern-cpp',
    prompt: 'Which statements are consequences of RAII?',
    explanation:
      'RAII ties a resource to an object lifetime. Everything else follows from destructors ' +
      'running deterministically at scope exit, including during stack unwinding.',
    tag: 'raii',
    createdDaysAgo: 80,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'multiple_choice',
      selectionMode: 'multiple',
      randomizeOptions: false,
      options: [
        {
          id: 'raii-unwind',
          content: richText('Resources are released when an exception unwinds the stack.'),
          correct: true,
        },
        {
          id: 'raii-scope',
          content: richText('Release happens deterministically at the end of scope.'),
          correct: true,
        },
        {
          id: 'raii-gc',
          content: richText('A garbage collector reclaims the memory later.'),
          correct: false,
        },
        {
          id: 'raii-manual',
          content: richText('Every acquisition needs a matching manual release call.'),
          correct: false,
        },
      ],
    },
  },
  {
    id: 'fixture-card-smart-pointer-code',
    deckId: 'fixture-modern-cpp',
    prompt: 'Write a complete C++ function `make_owner` that…',
    tip: 'Prefer the factory over a raw `new`.',
    explanation:
      '`std::make_unique` performs the allocation and the `unique_ptr` construction in one ' +
      'expression, so there is no window in which a raw pointer is unowned.',
    tag: 'smart-pointers',
    createdDaysAgo: 40,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'write_code',
      language: 'cpp',
      starterCode:
        'std::unique_ptr<Widget> make_owner(int id) {\n  // return an owning pointer to a Widget\n}',
      acceptedAnswers: [
        'std::unique_ptr<Widget> make_owner(int id) {\n  return std::make_unique<Widget>(id);\n}',
      ],
      comparison: { ...CODE_COMPARISON },
    },
  },
  {
    id: 'fixture-card-destruction-order',
    deckId: 'fixture-modern-cpp',
    prompt: 'A most-derived object leaves scope. Order its destruction steps.',
    explanation:
      'Destruction is construction in reverse, all the way down: body, then members in reverse ' +
      'declaration order, then bases in reverse declaration order.',
    tag: 'object-lifetime',
    createdDaysAgo: 36,
    scheduling: fresh(3),
    interaction: {
      type: 'ordering',
      randomize: true,
      items: [
        { id: 'dtor-body', content: richText('Run the most-derived destructor body') },
        {
          id: 'dtor-members',
          content: richText('Destroy its non-static members in reverse declaration order'),
        },
        { id: 'dtor-vptr', content: richText('Reset the vptr to the base class table') },
        { id: 'dtor-bases', content: richText('Destroy direct base classes in reverse order') },
        { id: 'dtor-storage', content: richText('Release the object storage') },
      ],
      correctOrder: ['dtor-body', 'dtor-members', 'dtor-vptr', 'dtor-bases', 'dtor-storage'],
    },
  },
  {
    id: 'fixture-card-iterator-invalidation',
    deckId: 'fixture-modern-cpp',
    prompt: 'Match each container operation to the iterators it invalidates',
    tag: 'containers',
    createdDaysAgo: 12,
    scheduling: fresh(6),
    interaction: {
      type: 'matching',
      columns: [
        {
          id: 'operation',
          label: 'Operation',
          items: [
            { id: 'vector-push', content: richText('`vector::push_back` past capacity') },
            { id: 'list-insert', content: richText('`list::insert`') },
            { id: 'deque-front', content: richText('`deque::push_front`') },
          ],
        },
        {
          id: 'invalidated',
          label: 'Invalidates',
          items: [
            { id: 'inv-all', content: richText('All iterators and references') },
            { id: 'inv-none', content: richText('No iterators or references') },
            { id: 'inv-iterators', content: richText('All iterators, but not references') },
          ],
        },
      ],
      relationships: [
        { operation: 'vector-push', invalidated: 'inv-all' },
        { operation: 'list-insert', invalidated: 'inv-none' },
        { operation: 'deque-front', invalidated: 'inv-iterators' },
      ],
    },
  },

  // ---- Compilers & MLIR ---------------------------------------------------
  {
    id: 'fixture-card-ssa-definition',
    deckId: 'fixture-compilers',
    prompt: 'SSA form guarantees that every value is assigned…',
    tip: 'The guarantee is about definitions, not about uses.',
    tag: 'ssa',
    createdDaysAgo: 118,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'recall',
      answer: richText(
        '**Exactly once.** Every value has a single, syntactically unique definition point, so ' +
          'the definition of any use is found without dataflow analysis.\n\n' +
          'Where control flow merges, a `phi` node introduces a *new* value rather than ' +
          'reassigning an existing one:\n\n' +
          '```mlir\n^bb3:\n  %x = phi [%x1, ^bb1], [%x2, ^bb2]\n```\n\n' +
          'A value may still be *used* any number of times.',
      ),
    },
  },
  {
    id: 'fixture-card-dialect-lowering',
    deckId: 'fixture-compilers',
    prompt: 'Trace this affine.for as it lowers to scf.for',
    tip: 'Affine maps carry the bounds; `scf` needs them as explicit values.',
    explanation:
      'Lowering out of `affine` gives up the analysis guarantees the affine maps provided, which ' +
      'is why affine passes run before the lowering, never after.',
    tag: 'mlir',
    createdDaysAgo: 110,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'walkthrough',
      scenario: richText(
        'One affine loop nest, on its way down to structured control flow.',
      ),
      code: {
        language: 'mlir',
        value:
          'affine.for %i = 0 to 64 {\n' +
          '  %v = affine.load %A[%i] : memref<64xf32>\n' +
          '  affine.store %v, %B[%i] : memref<64xf32>\n' +
          '}',
      },
      steps: [
        {
          id: 'step-bounds',
          focus: [{ startLine: 1, endLine: 1 }],
          prompt: richText('What must the loop bounds become before `scf.for` can be built?'),
          response: {
            type: 'multiple_choice',
            selectionMode: 'single',
            options: [
              {
                id: 'bounds-values',
                content: richText('Materialised SSA values from the affine maps'),
                correct: true,
              },
              {
                id: 'bounds-attrs',
                content: richText('Attributes on the `scf.for` operation'),
                correct: false,
              },
              {
                id: 'bounds-same',
                content: richText('Nothing - `scf.for` accepts affine maps directly'),
                correct: false,
              },
            ],
          },
        },
        {
          id: 'step-step',
          focus: [{ startLine: 1, endLine: 1 }],
          prompt: richText('What step value does the lowered `scf.for` carry? Type the number.'),
          tip: richText('`affine.for` has an implicit step of one.'),
          response: { type: 'exact_input', acceptedAnswers: ['1'] },
        },
        {
          id: 'step-memory',
          focus: [{ startLine: 2, endLine: 3 }],
          prompt: richText('What do `affine.load` and `affine.store` become?'),
          explanation: richText(
            'They become `memref.load` and `memref.store`, with the affine index maps applied ' +
              'explicitly through `affine.apply` where they were not already trivial.',
          ),
          response: {
            type: 'recall',
            answer: richText('`memref.load` and `memref.store`, with indices computed explicitly.'),
          },
        },
      ],
    },
  },
  {
    id: 'fixture-card-pass-ordering',
    deckId: 'fixture-compilers',
    prompt: 'Which statements about pass ordering are true?',
    explanation:
      'Pass ordering is not confluent: passes both consume and destroy each other preconditions, ' +
      'which is why pipelines are tuned rather than derived.',
    tag: 'passes',
    createdDaysAgo: 100,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'multiple_choice',
      selectionMode: 'multiple',
      randomizeOptions: false,
      options: [
        {
          id: 'pass-enable',
          content: richText('One pass can expose opportunities another pass then exploits.'),
          correct: true,
        },
        {
          id: 'pass-destroy',
          content: richText('A pass can destroy information a later pass needed.'),
          correct: true,
        },
        {
          id: 'pass-commute',
          content: richText('Optimisation passes commute, so order does not affect the result.'),
          correct: false,
        },
        {
          id: 'pass-optimal',
          content: richText('A single fixed pipeline is optimal for every program.'),
          correct: false,
        },
      ],
    },
  },
  {
    id: 'fixture-card-dominance-order',
    deckId: 'fixture-compilers',
    prompt: 'Order the steps of computing a dominance frontier',
    explanation:
      'The frontier of a node is where its dominance stops: the successors of blocks it ' +
      'dominates that it does not strictly dominate itself.',
    tag: 'dominance',
    createdDaysAgo: 74,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'ordering',
      randomize: true,
      items: [
        { id: 'df-cfg', content: richText('Build the control-flow graph') },
        { id: 'df-domtree', content: richText('Compute the dominator tree') },
        { id: 'df-joins', content: richText('Find every join point - a block with two or more predecessors') },
        {
          id: 'df-walk',
          content: richText('From each predecessor, walk up the dominator tree to the join idom'),
        },
        { id: 'df-add', content: richText('Add the join block to the frontier of every node walked') },
      ],
      correctOrder: ['df-cfg', 'df-domtree', 'df-joins', 'df-walk', 'df-add'],
    },
  },
  {
    id: 'fixture-card-peephole-code',
    deckId: 'fixture-compilers',
    prompt: 'Write a rewrite pattern that folds `addi %x, 0` to `%x`',
    tip: 'The folder returns the operand to use in place of the result.',
    explanation:
      'Returning the operand tells the rewriter to replace every use of the result with it. ' +
      'Returning `{}` means the operation was not folded.',
    tag: 'rewriting',
    createdDaysAgo: 66,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'write_code',
      language: 'cpp',
      starterCode:
        'OpFoldResult AddIOp::fold(FoldAdaptor adaptor) {\n' +
        '  if (matchPattern(adaptor.getRhs(), m_Zero()))\n' +
        '    // return the left operand\n' +
        '  return {};\n' +
        '}',
      acceptedAnswers: [
        'OpFoldResult AddIOp::fold(FoldAdaptor adaptor) {\n' +
          '  if (matchPattern(adaptor.getRhs(), m_Zero()))\n' +
          '    return getLhs();\n' +
          '  return {};\n' +
          '}',
      ],
      comparison: { ...CODE_COMPARISON },
    },
  },
  {
    id: 'fixture-card-ir-terminology',
    deckId: 'fixture-compilers',
    prompt: 'Match each MLIR concept to what it actually owns',
    tag: 'mlir',
    createdDaysAgo: 10,
    scheduling: fresh(9),
    interaction: {
      type: 'matching',
      columns: [
        {
          id: 'concept',
          label: 'Concept',
          items: [
            { id: 'op', content: richText('`Operation`') },
            { id: 'region', content: richText('`Region`') },
            { id: 'block', content: richText('`Block`') },
          ],
        },
        {
          id: 'owns',
          label: 'Owns',
          items: [
            { id: 'owns-regions', content: richText('A list of regions') },
            { id: 'owns-blocks', content: richText('A list of blocks') },
            { id: 'owns-ops', content: richText('A list of operations and its own arguments') },
          ],
        },
      ],
      relationships: [
        { concept: 'op', owns: 'owns-regions' },
        { concept: 'region', owns: 'owns-blocks' },
        { concept: 'block', owns: 'owns-ops' },
      ],
    },
  },

  // ---- Algorithms & Problem Solving ---------------------------------------
  {
    id: 'fixture-card-loop-invariant',
    deckId: 'fixture-algorithms',
    prompt: 'A loop invariant must hold at which three points?',
    tip: 'The same three points every correctness proof by induction uses.',
    tag: 'invariants',
    createdDaysAgo: 88,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'recall',
      answer: richText(
        '**Initialisation** - it is true before the first iteration.\n\n' +
          '**Maintenance** - if it is true before an iteration, it is still true before the next.\n\n' +
          '**Termination** - when the loop exits, the invariant plus the exit condition gives you ' +
          'the property you wanted to prove.',
      ),
    },
  },
  {
    id: 'fixture-card-rotated-search',
    deckId: 'fixture-algorithms',
    prompt: 'Trace this binary search over a rotated sorted array',
    tip: 'At every step one half is sorted. Decide which.',
    explanation:
      'The invariant is that at least one of `[lo, mid]` and `[mid, hi]` is sorted, so the target ' +
      'can always be excluded from one half in O(1).',
    tag: 'searching',
    createdDaysAgo: 60,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'walkthrough',
      scenario: richText('Search for `0` in `[4, 5, 6, 7, 0, 1, 2]`.'),
      code: {
        language: 'python',
        value:
          'lo, hi = 0, len(a) - 1\n' +
          'while lo <= hi:\n' +
          '    mid = (lo + hi) // 2\n' +
          '    if a[mid] == target: return mid\n' +
          '    if a[lo] <= a[mid]:\n' +
          '        ...',
      },
      steps: [
        {
          id: 'step-mid',
          focus: [{ startLine: 3, endLine: 3 }],
          prompt: richText('First iteration: what is `mid`? Type the index.'),
          response: { type: 'exact_input', acceptedAnswers: ['3'] },
        },
        {
          id: 'step-half',
          focus: [{ startLine: 5, endLine: 6 }],
          prompt: richText('Which half is sorted on the first iteration?'),
          tip: richText('Compare `a[lo]` with `a[mid]`.'),
          response: {
            type: 'multiple_choice',
            selectionMode: 'single',
            options: [
              { id: 'half-left', content: richText('The left half, `[4, 5, 6, 7]`'), correct: true },
              { id: 'half-right', content: richText('The right half, `[0, 1, 2]`'), correct: false },
              { id: 'half-both', content: richText('Both halves'), correct: false },
            ],
          },
        },
        {
          id: 'step-move',
          focus: [{ startLine: 5, endLine: 6 }],
          prompt: richText('So which way does the search move, and why?'),
          response: {
            type: 'recall',
            answer: richText(
              'Right. The left half is sorted and `0` is not inside `[4, 7]`, so `lo` becomes ' +
                '`mid + 1` and the whole left half is discarded.',
            ),
          },
        },
      ],
    },
  },
  {
    id: 'fixture-card-amortized',
    deckId: 'fixture-algorithms',
    prompt: 'Which statements about amortized analysis are true?',
    explanation:
      'Amortized analysis bounds a *sequence*. It says nothing about any single operation, which ' +
      'is exactly why it is the wrong tool for a latency budget.',
    tag: 'complexity',
    createdDaysAgo: 55,
    scheduling: introducedBeforeHistory(),
    interaction: {
      type: 'multiple_choice',
      selectionMode: 'multiple',
      randomizeOptions: false,
      options: [
        {
          id: 'am-sequence',
          content: richText('It bounds the average cost per operation over a worst-case sequence.'),
          correct: true,
        },
        {
          id: 'am-vector',
          content: richText('`vector::push_back` is amortized O(1) despite O(n) reallocations.'),
          correct: true,
        },
        {
          id: 'am-probability',
          content: richText('It depends on assumptions about the input distribution.'),
          correct: false,
        },
        {
          id: 'am-single',
          content: richText('It guarantees a bound on every individual operation.'),
          correct: false,
        },
      ],
    },
  },
  {
    id: 'fixture-card-topological-order',
    deckId: 'fixture-algorithms',
    prompt: "Order the steps of Kahn's topological sort",
    explanation:
      'If the output is shorter than the vertex count, the leftover vertices are exactly the ones ' +
      'on a cycle - which is why Kahn doubles as cycle detection.',
    tag: 'graphs',
    createdDaysAgo: 20,
    scheduling: fresh(-1),
    interaction: {
      type: 'ordering',
      randomize: true,
      items: [
        { id: 'kahn-degree', content: richText('Compute the in-degree of every vertex') },
        { id: 'kahn-seed', content: richText('Enqueue every vertex with in-degree zero') },
        { id: 'kahn-pop', content: richText('Pop a vertex and append it to the output') },
        {
          id: 'kahn-relax',
          content: richText('Decrement each successor in-degree, enqueuing any that reach zero'),
        },
        {
          id: 'kahn-check',
          content: richText('When the queue empties, compare the output length to the vertex count'),
        },
      ],
      correctOrder: ['kahn-degree', 'kahn-seed', 'kahn-pop', 'kahn-relax', 'kahn-check'],
    },
  },
  {
    id: 'fixture-card-two-pointer-code',
    deckId: 'fixture-algorithms',
    prompt: 'Write a function returning the longest subarray with sum at most k',
    tip: 'The window only ever needs to shrink from the left.',
    explanation:
      'Each index enters and leaves the window at most once, so the two-pointer scan is O(n) ' +
      'despite the inner loop.',
    tag: 'two-pointers',
    createdDaysAgo: 18,
    scheduling: fresh(-1),
    interaction: {
      type: 'write_code',
      language: 'python',
      starterCode:
        'def longest_at_most(a, k):\n' +
        '    best = lo = total = 0\n' +
        '    for hi, v in enumerate(a):\n' +
        '        total += v\n' +
        '        while total > k:\n' +
        '            # shrink the window from the left\n' +
        '        best = max(best, hi - lo + 1)\n' +
        '    return best',
      acceptedAnswers: [
        'def longest_at_most(a, k):\n' +
          '    best = lo = total = 0\n' +
          '    for hi, v in enumerate(a):\n' +
          '        total += v\n' +
          '        while total > k:\n' +
          '            total -= a[lo]\n' +
          '            lo += 1\n' +
          '        best = max(best, hi - lo + 1)\n' +
          '    return best',
      ],
      comparison: { ...CODE_COMPARISON },
    },
  },
  {
    id: 'fixture-card-structure-lookup',
    deckId: 'fixture-algorithms',
    prompt: 'Match each data structure to its worst-case lookup cost',
    tag: 'data-structures',
    createdDaysAgo: 8,
    scheduling: fresh(4),
    interaction: {
      type: 'matching',
      columns: [
        {
          id: 'structure',
          label: 'Structure',
          items: [
            { id: 'hash', content: richText('Hash table with chaining') },
            { id: 'balanced', content: richText('Balanced binary search tree') },
            { id: 'sorted-array', content: richText('Sorted array, binary search') },
          ],
        },
        {
          id: 'cost',
          label: 'Worst case',
          items: [
            { id: 'cost-n', content: richText('O(n)') },
            { id: 'cost-logn', content: richText('O(log n)') },
          ],
          fixed: true,
        },
      ],
      relationships: [
        { structure: 'hash', cost: 'cost-n' },
        { structure: 'balanced', cost: 'cost-logn' },
        { structure: 'sorted-array', cost: 'cost-logn' },
      ],
    },
  },
]
