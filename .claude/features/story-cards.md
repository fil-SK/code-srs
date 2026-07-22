# Story cards

A **Story** is one card that holds a shared context (code and/or an image) plus
an **ordered list of steps** the learner walks through one at a time, revealing
each step's answer inline. It is for practical, multi-part analysis (e.g. "trace
the constructor/destructor order in this class hierarchy", or "what does each of
these assembler lines do").

## Why it fits without touching shared machinery

The review loop is strictly two-phase per card: Question -> reveal -> Answer ->
**one FSRS grade**. A Story is inherently multi-reveal, so instead of changing
the loop it drives the whole step walk **inside its own `Question` component**
and reuses the existing interactive gate:

- `interactive: true` + `isResponseReady` keep the outer "Show answer" / grade
  bar **locked until the last step is revealed**, so the learner always grades
  the whole assignment once (self-assessed; there is **no `autoGrade`**).
- The multi-step state lives in the review **response** (`{ index, revealed }`),
  not component state, because `ReviewSession` resets the response per card but
  does not remount the `Question` between same-typed cards.

Result: no FSRS change, no `ReviewSession`/`PreviewPage` change, and — because
cards are stored as JSON blobs — **no database migration**.

## Data model (`src/types/card.ts`)

```ts
interface StoryStep {
  id: ID
  prompt: string      // markdown question for this step
  answer: string      // markdown answer, revealed on demand
  code?: CodeBlock    // optional code specific to this step
  highlight?: string  // line spec (e.g. "26-34, 40") emphasized in the SHARED code
}
interface StoryContent {
  intro?: string       // framing prose above the context
  code?: CodeBlock     // shared code, pinned while stepping
  image?: string       // shared image as a data URL, pinned while stepping
  steps: StoryStep[]
  explanation?: string // wrap-up shown with the final grade
}
```

## Key files (`src/features/cards/renderers/story/`)

- `index.ts` — the `CardTypeDefinition`. `emptyContent` seeds one empty step;
  `isComplete` needs every step to have a prompt + answer; `isResponseReady`
  delegates to `isFinished`.
- `progress.ts` — `StoryProgress` shape, `readProgress`, and `isFinished`
  (finished = last step revealed; a zero-step story is trivially ready).
- `Question.tsx` — the stepper. Renders shared context (`StoryContext`) + the
  current step with Reveal/Next/Previous. **Read-only mode** (static preview)
  expands all steps at once instead.
- `Answer.tsx` — the wrap-up shown on the outer reveal (steps were already
  revealed inline), plus the optional explanation.
- `Editor.tsx` — intro, toggleable shared code, **image upload/paste as a data
  URL** (with a >500 KB size warning, since the image lives in the card row),
  a reorderable step list, and per-step fields.

## Design decisions worth knowing

- **Images are data URLs** embedded in the card (chosen for zero infra / offline
  over a Supabase Storage bucket). The editor warns on large files. If images
  ever get big, a Storage bucket is the upgrade path.
- **Steps are reveal-only** with one final grade (not individually auto-graded),
  matching "iterate and think, then reveal".

## Shared-code line highlighting

A step can spotlight lines of the **shared** listing via `StoryStep.highlight`
(a spec like `"26-34, 40"`).

- `src/components/code/lineRanges.ts` — `parseLineRanges(spec)` -> sorted, deduped
  1-based line numbers (ignores junk, caps absurd ranges). Tested.
- `src/components/code/CodeView.tsx` — a `highlightLines` prop paints those lines
  via a static CodeMirror line decoration (accent tint + left accent bar). It
  rebuilds only when the serialized line set changes, not per render.
  `LazyCodeView` forwards the prop.
- In `Question.tsx`, the highlight tracks the **active step** and shows
  immediately (before reveal) as a focus cue, with a "Focus on lines …" caption.
  The read-only expanded view can't tint one shared block for several steps at
  once, so it shows each step's focus as a caption instead.
- The editor's "Highlight lines" input appears **only when the story has shared
  code** (there is nothing to target otherwise).

## Adding to a Story-like type

Follow the "add a card type" checklist in `CLAUDE.md`. Story specifically
touches: registry, `cardTypeMeta` (+ `getCardTitle`), `searchableText`,
`seedContent` (seeds `intro` from a draft's text).
