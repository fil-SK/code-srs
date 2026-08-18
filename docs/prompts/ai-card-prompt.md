# Prompt for generating Itera flashcards

Paste **everything inside the fenced block below** into a fresh Claude chat, then add
your study material (notes, slides, a topic list, etc.). Claude will return a single
JSON file you import via **Account settings → Import / Export → Import JSON → Merge**.

> Tip: ask for **one file per topic/deck (~20–40 cards)** so the output isn't truncated.
> Merge can be run repeatedly and only *adds*, except that a card or deck whose `id`
> already exists is overwritten — so keep ids unique unless you mean to replace something.

**This prompt targets backup version 2 and the single `Card` model** (six interaction
types, scheduling embedded on the card). It was rewritten on 2026-08-18; the previous
version emitted the deleted v1 8-type schema, which the importer now rejects outright.

---

````text
You are generating flashcards for "Itera", a spaced-repetition app for software
engineering / CS topics. Output a SINGLE JSON file (a "backup" envelope) that I will
import with Merge. Follow this schema EXACTLY. The app validates the file structurally
on import and refuses the whole file if anything is wrong, so a wrong field name,
a missing field, or a broken id reference means nothing is imported at all.

## Output rules
- Output ONLY the JSON, in one ```json code block. No prose before or after.
- Valid JSON: double quotes, no trailing commas, no comments.
- Multi-line text (code, prose) uses real "\n" escapes inside JSON strings.
- Every prose field is a RICH TEXT object, never a bare string:
      { "format": "markdown", "value": "the text" }
  This is the single most common mistake. `"prompt": "What is a mutex?"` is INVALID;
  `"prompt": { "format": "markdown", "value": "What is a mutex?" }` is correct.
- Markdown supported inside a "value": `inline code`, **bold**, *italic*, and fenced
  ```code``` blocks (with a language tag) get real syntax highlighting. Underscores are
  NOT emphasis markers (so snake_case renders literally) - only single/double asterisks
  are. Use the dedicated code fields (write_code / walkthrough) for substantial snippets;
  use fenced blocks inside a "value" for short inline examples.

## Top-level envelope (exactly this shape)
{
  "app": "code-srs",
  "version": 2,
  "exportedAt": 1750000000000,
  "data": {
    "decks": [ <Deck>, ... ],
    "cards": [ <Card>, ... ],
    "drafts": [],
    "reviewLogs": []
  }
}
- "app" MUST be the literal string "code-srs". It is a legacy backup-format identifier
  kept for compatibility with files exported before the product was renamed to Itera -
  it is NOT the product name. Do not "correct" it to "itera"; the importer rejects
  anything else.
- "version" MUST be 2. Version 1 files use a deleted card model and are refused.
- "drafts" and "reviewLogs" must be present and empty: [].

## Deck (group the cards)
Create one or more decks and put the cards in them.
{
  "id": "deck-os",
  "name": "Operating Systems",
  "description": "Processes, threads, scheduling.",   // optional
  "parentId": "<optional: id of another deck in this file>",
  "createdAt": 1750000000000,
  "updatedAt": 1750000000000
}
- "id", "name", "createdAt", "updatedAt" are required. Timestamps are epoch
  milliseconds (plain numbers), not date strings.
- Do NOT emit a "language" field. It exists, but it holds a natural-language code
  ("en", "de", "sr", ...) for the deck's wording, not a programming language.
- Every card's "deckId" MUST equal a deck "id" in this file, unless I have told you to
  add cards to a deck that already exists in my library (in which case use that exact
  deck id and you may leave "decks" empty).
- To later ADD more cards to the SAME deck, reuse the SAME deck "id".

### Nesting decks (build a hierarchy)
Decks form a tree of ANY depth via "parentId". Omit "parentId" for a top-level deck;
set it to another deck's "id" to nest underneath. Cards may attach to ANY deck (a parent
"section" or a leaf):
"decks": [
  { "id": "os",      "name": "Operating Systems", "createdAt": 1750000000000, "updatedAt": 1750000000000 },
  { "id": "proc",    "name": "Processes", "parentId": "os",   "createdAt": 1750000000000, "updatedAt": 1750000000000 },
  { "id": "threads", "name": "Threads",   "parentId": "proc", "createdAt": 1750000000000, "updatedAt": 1750000000000 },
  { "id": "sched",   "name": "Scheduling","parentId": "proc", "createdAt": 1750000000000, "updatedAt": 1750000000000 }
]
- Prefer putting cards on the leaf decks ("threads", "sched"); studying a parent
  reviews it plus everything nested under it.
- Every "parentId" should reference a deck "id" present in THIS file.

## ID rules
- "id" on decks and cards must be GLOBALLY UNIQUE strings. Use readable slugs
  ("card-os-threads-01") or UUID-style values. Do NOT reuse ids across cards.
- Nested ids (option / item / column / step ids) only need to be unique WITHIN their
  own card, and are referenced by other fields of the same card, so keep them consistent.

## Scheduling (identical for every new card - copy verbatim)
"scheduling": {
  "due": 0,
  "stability": 0,
  "difficulty": 0,
  "elapsedDays": 0,
  "scheduledDays": 0,
  "reps": 0,
  "lapses": 0,
  "learningSteps": 0,
  "state": "new"
}
- All nine fields are required. Every one except "state" is a number; "state" is one of
  "new", "learning", "review", "relearning" and must be "new" for a generated card.
- "due": 0 means "due immediately", so the card appears in Review right away.

## Card envelope (every card has these fields)
{
  "id": "card-os-01",
  "schemaVersion": 2,
  "deckId": "<a deck id from this file>",
  "prompt":      { "format": "markdown", "value": "The question shown on the front." },
  "tip":         { "format": "markdown", "value": "Optional nudge, shown before answering." },
  "explanation": { "format": "markdown", "value": "Optional, shown after answering." },
  "interaction": { ...shape depends on the type, see below... },
  "tags": ["lowercase", "short", "tags"],
  "createdAt": 1750000000000,
  "updatedAt": 1750000000000,
  "suspended": false,
  "scheduling": { ...the block above... }
}
- "schemaVersion" MUST be the number 2.
- "prompt" is required and is where the question always lives - none of the six
  interaction payloads carries its own question text.
- "tip" and "explanation" are optional; omit the keys entirely rather than sending null.
- "tags" is required; use [] if you have none.
- "suspended" must be false.

## The 6 interaction types and their "interaction" shapes

1) "recall" - question/answer, self-graded. The default; use it when unsure.
   "interaction": {
     "type": "recall",
     "answer": { "format": "markdown", "value": "The answer text." }
   }
   - This one type covers plain definitions, "read this code and explain it", and
     "find the bug": put the code in the "prompt" as a fenced block and the reasoning
     in "answer".

2) "multiple_choice" - auto-graded.
   "interaction": {
     "type": "multiple_choice",
     "selectionMode": "single",
     "randomizeOptions": true,
     "options": [
       { "id": "o1", "content": { "format": "markdown", "value": "O(1)" },     "correct": true },
       { "id": "o2", "content": { "format": "markdown", "value": "O(log n)" }, "correct": false },
       { "id": "o3", "content": { "format": "markdown", "value": "O(n)" },     "correct": false }
     ]
   }
   - Correctness is a boolean ON each option. There is no separate "correct" id list.
   - "selectionMode" is "single" (exactly one correct) or "multiple" (mark every
     correct option true). Give 3-5 options.

3) "write_code" - the learner types code; auto-graded by normalized comparison.
   "interaction": {
     "type": "write_code",
     "language": "python",
     "starterCode": "def add(a, b):\n    return ___",
     "acceptedAnswers": ["a + b", "b + a"],
     "comparison": {
       "trimOuterWhitespace": true,
       "normalizeLineEndings": true,
       "ignoreTrailingWhitespace": true,
       "caseSensitive": false
     }
   }
   - All four "comparison" booleans are required.
   - "acceptedAnswers" are the WHOLE contents of the editor after the learner edits it,
     so keep "starterCode" to a single short line or an empty string, and list realistic
     variants. The FIRST entry in "acceptedAnswers" is shown as the model answer after
     the learner submits, so make it the cleanest version. Do NOT emit "editableRegion" -
     the whole block is editable.

4) "ordering" - arrange items in the correct order; auto-graded position by position.
   "interaction": {
     "type": "ordering",
     "randomize": true,
     "items": [
       { "id": "i1", "content": { "format": "markdown", "value": "Lexical analysis" } },
       { "id": "i2", "content": { "format": "markdown", "value": "Parsing" } },
       { "id": "i3", "content": { "format": "markdown", "value": "Code generation" } }
     ],
     "correctOrder": ["i1", "i2", "i3"]
   }
   - List "items" IN THE CORRECT ORDER, and repeat exactly those ids in that same order
     in "correctOrder". The app shuffles them for the learner. Use 3-6 items.

5) "matching" - connect a term to its value(s); auto-graded per cell.
   "interaction": {
     "type": "matching",
     "columns": [
       { "id": "source", "label": "Container", "fixed": false, "items": [
         { "id": "r1", "content": { "format": "markdown", "value": "std::unordered_map" } },
         { "id": "r2", "content": { "format": "markdown", "value": "std::map" } },
         { "id": "r3", "content": { "format": "markdown", "value": "std::vector" } }
       ]},
       { "id": "lookup", "label": "Average lookup", "fixed": false, "items": [
         { "id": "r1-lookup", "content": { "format": "markdown", "value": "O(1)" } },
         { "id": "r2-lookup", "content": { "format": "markdown", "value": "O(log n)" } },
         { "id": "r3-lookup", "content": { "format": "markdown", "value": "O(n)" } }
       ]}
     ],
     "relationships": [
       { "source": "r1", "lookup": "r1-lookup" },
       { "source": "r2", "lookup": "r2-lookup" },
       { "source": "r3", "lookup": "r3-lookup" }
     ]
   }
   - The FIRST column is the term ("source") side; it is always "fixed": false and its
     items are the rows. Give it 3-6 items.
   - MAXIMUM 3 COLUMNS TOTAL (the term column plus at most two value columns).
   - Each object in "relationships" is one row: it maps every column's "id" to the id of
     the item chosen from that column. Keys are COLUMN ids, values are ITEM ids.
   - "fixed": false means that column has exactly one item per row (a one-to-one match) -
     this is the normal case, so give it the same number of items as the source column.
     "fixed": true means the column is a short shared list of options reused across rows
     (e.g. "O(1)" / "O(n)" answering several terms); then its "items" are those shared
     options and several rows may point at the same item id.
   - Prefer "fixed": false unless the same value genuinely answers several terms.

6) "walkthrough" - a multi-step trace over one shared piece of code or context.
   "interaction": {
     "type": "walkthrough",
     "scenario": { "format": "markdown", "value": "Trace what `foo(3, 4)` returns." },
     "code": { "language": "cpp", "value": "int foo(int a, int b) {\n  int s = 0;\n  for (int i = 0; i < b; i++) s += a;\n  return s;\n}" },
     "steps": [
       {
         "id": "s1",
         "focus": [{ "startLine": 2, "endLine": 2 }],
         "prompt": { "format": "markdown", "value": "What is `s` before the loop?" },
         "explanation": { "format": "markdown", "value": "It is initialized to 0." },
         "response": { "type": "recall", "answer": { "format": "markdown", "value": "0" } }
       },
       {
         "id": "s2",
         "focus": [{ "startLine": 3, "endLine": 3 }],
         "prompt": { "format": "markdown", "value": "What does the loop compute?" },
         "response": { "type": "recall", "answer": { "format": "markdown", "value": "a * b, by repeated addition." } }
       }
     ]
   }
   - "scenario" and a non-empty "steps" array are required; "code" is optional but is
     what makes this type worth using.
   - Every step needs "id", "prompt" and "response". Use
     "response": { "type": "recall", "answer": <rich text> } unless I ask otherwise.
   - "focus" is optional: a list of 1-based line ranges into "code" (inclusive).
   - Per-step "tip" and "explanation" are optional and are separate from the card-wide
     "tip"/"explanation".
   - Use walkthrough only for several sequential beats over ONE shared context; a single
     question about a snippet is a "recall" card.

## Allowed "language" values for code fields
"cpp", "python", "javascript", "typescript", "rust", "text"
(Use "text" for pseudocode or anything else.)

## Type-selection guidance
- Definitions, facts, "why", reading a snippet, spotting a bug -> "recall".
- "Which of these..." -> "multiple_choice".
- "Write / complete this code" -> "write_code".
- Sequences, pipelines, phases, steps -> "ordering".
- Term <-> definition, concept <-> property, container <-> complexity -> "matching".
- Multi-step trace over one shared snippet -> "walkthrough".
Aim for a mix, weighted toward "recall". Default to "recall" when unsure.

## Final checks before you output
- "app" is "code-srs" and "version" is 2.
- Every card has "schemaVersion": 2, "suspended": false, "tags", both timestamps, and the
  exact 9-field scheduling block with "state": "new".
- Every prose field is { "format": "markdown", "value": "..." } - prompt, tip,
  explanation, recall.answer, option.content, item.content, walkthrough.scenario,
  step.prompt, step.response.answer.
- Every card.deckId matches a deck.id in the file (or a deck id I gave you).
- Every deck.parentId (if present) matches another deck.id in the file.
- Every card id and deck id is unique.
- multiple_choice: at least one option has "correct": true.
- ordering: "correctOrder" lists exactly the "items" ids, in the authored order.
- matching: at most 3 columns; every relationship key is a column id and every value is
  an item id from that column.
- walkthrough: every step has an "id", a "prompt" and a "response".
- "drafts": [] and "reviewLogs": [] are present.
- The whole thing is valid JSON in one ```json block.

Now create the flashcards from the material I provide next.
````

---

## How to import
1. In Itera: **Account settings → Import / Export → Export JSON** first (backup, just in case).
2. Save the model's output as e.g. `os-cards.json`.
3. **Import JSON**, select **Merge**, choose the file.
4. New deck(s) + cards appear; they're due immediately in Review.

If the import is refused, the message names the offending card or deck by position and id
(for example, *Card 4 ("card-os-04") has an unsupported interaction type "mcq"*). Nothing
is written when a file is refused, so it is safe to fix the JSON and try again.

If an import ever looks wrong, re-import your backup with **Replace** to roll back.
