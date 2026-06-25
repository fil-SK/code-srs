# Prompt for generating code-srs flashcards

Paste **everything inside the fenced block below** into a fresh Claude chat, then add
your study material (notes, slides, a topic list, etc.). Claude will return a single
JSON file you import via **Settings → Import JSON → Merge** in code-srs.

> Tip: ask for **one file per topic/deck (~20–40 cards)** so the output isn't truncated.
> Merge can be run repeatedly and only *adds* — it never overwrites existing cards.

---

````text
You are generating flashcards for "code-srs", a spaced-repetition app for software
engineering / CS topics. Output a SINGLE JSON file (a "backup" envelope) that I will
import with Merge. Follow this schema EXACTLY — the app does not validate the file on
import, so any wrong field name, missing field, or broken id reference will crash it.

## Output rules
- Output ONLY the JSON, in one ```json code block. No prose before or after.
- Valid JSON: double quotes, no trailing commas, no comments.
- Multi-line text (code, prose) uses real "\n" escapes inside JSON strings.
- Treat all text fields as PLAIN TEXT (markdown is not rendered yet). Put code in the
  dedicated code fields / code card types, not in markdown fences.

## Top-level envelope (exactly this shape)
{
  "app": "code-srs",
  "version": 1,
  "exportedAt": 1750000000000,
  "data": {
    "decks": [ <Deck>, ... ],
    "cards": [ <Card>, ... ],
    "drafts": [],
    "reviewLogs": []
  }
}
- "drafts" and "reviewLogs" must be present and empty: [].

## Deck (group the cards)
Create one or more decks and put the cards in them.
{
  "id": "<unique id, e.g. deck-os-001>",
  "name": "Operating Systems",
  "parentId": "<optional: id of another deck in this file>",
  "createdAt": 1750000000000,
  "updatedAt": 1750000000000
}
- Every card's "deckId" MUST equal a deck "id" in this file.
- To later ADD more cards to the SAME deck, reuse the SAME deck "id".

### Nesting decks (build a hierarchy)
Decks form a tree of ANY depth via "parentId". Omit "parentId" for a top-level
deck; set it to another deck's "id" to nest underneath. Cards may attach to ANY
deck (a parent "section" or a leaf). Example: Operating Systems → Processes →
Threads / Scheduling, with cards on the leaves:
"decks": [
  { "id": "os",     "name": "Operating Systems", "createdAt": 1750000000000, "updatedAt": 1750000000000 },
  { "id": "proc",   "name": "Processes", "parentId": "os",   "createdAt": 1750000000000, "updatedAt": 1750000000000 },
  { "id": "threads","name": "Threads",   "parentId": "proc", "createdAt": 1750000000000, "updatedAt": 1750000000000 },
  { "id": "sched",  "name": "Scheduling","parentId": "proc", "createdAt": 1750000000000, "updatedAt": 1750000000000 }
]
- Prefer putting cards on the leaf decks (e.g. "threads", "sched"); studying a
  parent reviews it plus everything nested under it.
- Every "parentId" must reference a deck "id" present in THIS file.

## ID rules
- "id" on decks and cards must be GLOBALLY UNIQUE strings. Use UUID-style values, e.g.
  "card-3f9a1c8e-..." or any random unique string. Do NOT reuse ids across cards.
- Nested ids (option/item/pair ids) only need to be unique WITHIN their own card.

## Scheduling (identical for every new card — copy verbatim)
"scheduling": {
  "due": 0, "stability": 0, "difficulty": 0,
  "elapsedDays": 0, "scheduledDays": 0,
  "reps": 0, "lapses": 0, "learningSteps": 0,
  "state": "new"
}
(due:0 makes the card due immediately.)

## Card envelope (every card has these fields, plus "type" + "content")
{
  "id": "<unique>",
  "deckId": "<a deck id from this file>",
  "tags": ["lowercase", "short", "tags"],
  "createdAt": 1750000000000,
  "updatedAt": 1750000000000,
  "suspended": false,
  "scheduling": { ...the block above... },
  "type": "<one of the 7 below>",
  "content": { ...shape depends on type... }
}

## The 7 card types and their "content" shapes

1) "basic" — question/answer, self-graded.
   "content": { "front": "Question text", "back": "Answer text" }

2) "mcq" — multiple choice, auto-graded.
   "content": {
     "prompt": "Question text",
     "options": [
       { "id": "o1", "text": "Choice A" },
       { "id": "o2", "text": "Choice B" },
       { "id": "o3", "text": "Choice C" }
     ],
     "correct": ["o2"],          // ids of the correct option(s); must exist in options
     "multiple": false,          // true if more than one correct answer
     "explanation": "Why."       // optional
   }
   - If "multiple" is true, list all correct ids in "correct".

3) "codeReading" — show code, ask about it, reveal answer. Self-graded.
   "content": {
     "code": { "language": "cpp", "code": "int main() {\n  ...\n}" },
     "question": "What does this print and why?",
     "answer": "Explanation text."
   }

4) "codeCompletion" — user types the missing code; auto-graded by normalized match.
   "content": {
     "scaffold": { "language": "python", "code": "def add(a, b):\n    return ___" },
     "solutions": ["a + b", "b + a"],   // ACCEPTED ANSWERS = just the missing snippet
     "validation": { "mode": "normalizedMatch", "ignoreWhitespace": true, "caseSensitive": false },
     "explanation": "Optional."
   }
   - Put a visible blank in the scaffold (e.g. ___ or /* ??? */).
   - "solutions" are what the learner types, NOT the whole program. List variants.

5) "bugFinding" — show buggy code, learner finds the bug, reveal explanation. Self-graded.
   "content": {
     "code": { "language": "cpp", "code": "for (int i = 0; i <= n; i++) {...}" },
     "question": "What is the bug?",   // optional; defaults to "Find the bug"
     "bugHint": "Look at the loop bound.",  // optional
     "explanation": "Off-by-one: <= should be <."
   }

6) "ordering" — arrange steps in the correct order; auto-graded.
   "content": {
     "prompt": "Order the stages of compilation.",
     "items": [
       { "id": "i1", "text": "Lexical analysis" },
       { "id": "i2", "text": "Parsing" },
       { "id": "i3", "text": "Code generation" }
     ]
   }
   - List "items" IN THE CORRECT ORDER (top = first). The app shuffles them for the learner.

7) "matching" — match left items to right items; auto-graded.
   "content": {
     "prompt": "Match each container to its average lookup complexity.",
     "pairs": [
       { "id": "p1", "left": "std::unordered_map", "right": "O(1)" },
       { "id": "p2", "left": "std::map", "right": "O(log n)" },
       { "id": "p3", "left": "std::vector (by value)", "right": "O(n)" }
     ]
   }
   - The correct match is left<->right WITHIN the same pair object. Provide 3–6 pairs.

## Allowed "language" values for code fields
"cpp", "python", "javascript", "typescript", "rust", "text"
(Use "text" for pseudocode or anything else.)

## Type-selection guidance
- Definitions / facts / "why" → "basic".
- "Which of these…" → "mcq".
- Reading/tracing a snippet → "codeReading".
- "fill in the missing line" → "codeCompletion".
- "spot the defect" → "bugFinding".
- Sequences/pipelines/steps → "ordering".
- Term↔definition / concept↔property → "matching".
Aim for a mix of types. Default to "basic" when unsure.

## Final checks before you output
- Every card.deckId matches a deck.id in the file.
- Every deck.parentId (if present) matches another deck.id in the file.
- For a broad topic, organize decks into a sensible nested hierarchy via parentId.
- Every card has a unique id and the exact scheduling block.
- mcq.correct ids all exist in mcq.options.
- ordering.items are in the correct order.
- drafts: [] and reviewLogs: [] are present.
- The whole thing is valid JSON in one ```json block.

Now create the flashcards from the material I provide next.
````

---

## How to import
1. In code-srs: **Settings → Export JSON** first (backup, just in case).
2. Save Claude's output as e.g. `os-cards.json`.
3. **Settings → Import JSON**, select **Merge**, choose the file.
4. New deck(s) + cards appear; they're due immediately in Review.

If an import ever looks wrong, re-import your backup with **Replace** to roll back.
