import type { CardV2 } from '@/types/cardV2'
import { CARD_V2_SCHEMA_VERSION, richText } from '@/types/cardV2'

// Representative Recall content for /design-preview/review/recall: real
// Markdown (bold/italic/inline code) plus a formatted C++ fenced code block,
// so the preview exercises the same rendering path real content will use.
export const recallFixture: CardV2 = {
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
