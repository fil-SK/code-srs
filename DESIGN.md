# code-srs — Technical Specification

> A local-first, single-user Progressive Web App for spaced-repetition learning of
> software / CS topics, where **code is a first-class card element**.
> Statically hostable for free; designed to adopt a Supabase backend later
> without UI changes.

Status: **design approved, pre-implementation.** No implementation code until the
architecture is signed off.

---

## 1. Goals & Non-Goals

**Goals**
- Review queue, learning-progress tracking, draft/question capture, cross-device access.
- Mobile-friendly, usable from any browser, free to deploy.
- Maintainable, easy to extend, modern architecture, clean codebase, no overengineering.

**Non-Goals (v1)**
- Authentication, multi-user, real-time sync.
- Server-side code execution.
- Native mobile apps.

Each non-goal is a clean *later* addition behind the storage seam, not a current cost.

---

## 2. Stack

| Concern | Choice |
|---|---|
| Build / framework | Vite + React 18 + TypeScript |
| Routing | React Router |
| Data access / cache | TanStack Query (uniform async API over the repository) |
| Session / UI state | Zustand (transient only: active review session, theme) |
| Styling / UI kit | Tailwind CSS + shadcn/ui (Radix primitives, copied in) |
| Code display + editing | **CodeMirror 6 only** (read-only mode for display, editable for completion) |
| Scheduling | `ts-fsrs` (FSRS algorithm) |
| Local storage | Dexie (IndexedDB) |
| PWA / offline | `vite-plugin-pwa` |
| Testing | Vitest |
| Future backend | Supabase (Postgres + Auth + RLS) |

---

## 3. Architecture

Local-first PWA. The **Repository interface is the central seam**: UI and domain
logic are storage-agnostic. Today it resolves to IndexedDB (Dexie); later it
points at Supabase with zero UI changes.

```
Browser (PWA)
  React + TS UI  ->  TanStack Query  ->  Repository interface  (the seam)
                                              |
                          DexieRepository (now)   SupabaseRepository (later)

  Domain layer (pure TS): scheduling (FSRS), grading, import/export, search
  — no React, no storage knowledge.
```

**Dependency rule:** dependencies point inward.
`features -> hooks -> data / domain`. `domain` depends on nothing.

---

## 4. Data Model

Discriminated union on `type`: a shared envelope (`CardBase`) plus a typed
`content` payload per card type. `CodeBlock` is modeled once and reused.

```ts
type ID = string;        // uuid v4
type Millis = number;    // Date.now()

interface CodeBlock { language: string; code: string; }

interface CardBase {
  id: ID;
  deckId: ID;
  tags: string[];               // tags are strings; deck is a real entity
  createdAt: Millis;
  updatedAt: Millis;
  suspended: boolean;           // excluded from queue without deleting
  scheduling: SchedulingState;  // FSRS state
}

interface BasicContent { front: string; back: string; }            // markdown

interface McqContent {
  prompt: string;
  options: { id: ID; text: string }[];
  correct: ID[];                // length 1 = single, >1 = multi
  multiple: boolean;            // radio vs checkbox hint
  explanation?: string;
}

interface CodeReadingContent { code: CodeBlock; question: string; answer: string; }

interface CodeCompletionContent {
  scaffold: CodeBlock;          // code with a blank region/marker
  solutions: string[];          // accepted answers for auto-check
  validation: {
    mode: 'none' | 'normalizedMatch';   // 'run' deferred
    ignoreWhitespace: boolean;
    caseSensitive: boolean;
  };
  explanation?: string;
}

interface BugFindingContent {
  code: CodeBlock;
  question?: string;            // default: "Find the bug"
  bugHint?: string;
  explanation: string;
}

interface OrderingContent {
  prompt: string;
  items: { id: ID; text: string; code?: CodeBlock }[];  // stored in CORRECT order
}

interface MatchingContent {
  prompt: string;
  pairs: { id: ID; left: string; right: string }[];     // left<->right is truth
}

type Card =
  | (CardBase & { type: 'basic';          content: BasicContent })
  | (CardBase & { type: 'mcq';            content: McqContent })
  | (CardBase & { type: 'codeReading';    content: CodeReadingContent })
  | (CardBase & { type: 'codeCompletion'; content: CodeCompletionContent })
  | (CardBase & { type: 'bugFinding';     content: BugFindingContent })
  | (CardBase & { type: 'ordering';       content: OrderingContent })
  | (CardBase & { type: 'matching';       content: MatchingContent });

type CardType = Card['type'];

interface Deck {
  id: ID; name: string; description?: string;
  parentId?: ID;                // optional nesting
  createdAt: Millis; updatedAt: Millis;
}

interface Draft {               // inbox item, pre-card
  id: ID;
  rawText: string;
  code?: CodeBlock;
  intendedType?: CardType;
  intendedDeckId?: ID;
  createdAt: Millis;
}

type Rating = 1 | 2 | 3 | 4;    // Again / Hard / Good / Easy

interface ReviewLog {
  id: ID; cardId: ID; reviewedAt: Millis;
  rating: Rating; autoGraded: boolean; durationMs: number;
  stabilityBefore: number; stabilityAfter: number;
  difficultyBefore: number; difficultyAfter: number;
  state: SchedulingState['state'];
}

interface SchedulingState {     // mirrors ts-fsrs Card
  due: Millis; stability: number; difficulty: number;
  elapsedDays: number; scheduledDays: number;
  reps: number; lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  lastReview?: Millis;
}
```

Modeling decisions: discriminated union (type-safe, exhaustive `switch`);
markdown strings for rich text (prose + code fences, exportable); tags as
`string[]` and deck as an entity (1 card -> 1 deck, many tags); single reusable
`CodeBlock`; `Draft` is a separate entity that converts into a `Card` (then is
deleted).

---

## 5. Storage Strategy

### Repository interface (contract both backends honor)

```ts
interface Repository {
  cards:   CardRepo;
  decks:   CrudRepo<Deck>;
  drafts:  CrudRepo<Draft>;
  reviews: ReviewRepo;
}

interface CardRepo extends CrudRepo<Card> {
  getDue(opts: { deckId?: ID; tags?: string[]; now: Millis; limit?: number }): Promise<Card[]>;
  search(query: CardQuery): Promise<Card[]>;
}

interface ReviewRepo {
  append(log: ReviewLog): Promise<void>;
  forCard(cardId: ID): Promise<ReviewLog[]>;
  range(from: Millis, to: Millis): Promise<ReviewLog[]>;
}
```

### Local-only (now)
- **Dexie / IndexedDB.** Tables: `cards`, `decks`, `drafts`, `reviewLogs`.
- Indexes: `cards: id, deckId, *tags, scheduling.due, type` (`*tags` = multi-entry).
- Search: client-side filtering first; add MiniSearch (inverted index) only if slow.
- Backup + portability: JSON import/export (also the migration path).

### Future Supabase (later)
- Postgres; `content` as `jsonb` (mirrors the union — no schema churn per card type).
- Indexes: btree on `deck_id`, `(scheduling->>'due')`; GIN on `tags` and `content`.
- Supabase Auth + Row-Level Security (`user_id` column), safe even single-user.
- Sync model: **start "online with local cache"**, not bidirectional sync.
  Supabase = source of truth; TanStack Query caches. Full offline-write sync
  (conflict resolution, tombstones) deferred until genuinely needed.
- Migration: export JSON local -> import into Supabase via the same import code.

---

## 6. Review & Scheduling

- **Algorithm: FSRS via `ts-fsrs`**, isolated in `domain/scheduling/`.
  Pure function `(SchedulingState, Rating, now) -> (newState, ReviewLog)`.
- **Two interaction modes bridged to FSRS ratings:**
  - *Self-graded* (basic, codeReading, bugFinding, codeCompletion manual): user
    reveals answer, taps 4-button GradeBar (Again/Hard/Good/Easy).
  - *Auto-graded* (mcq, ordering, matching, codeCompletion normalizedMatch):
    **auto decides pass/fail** (correct -> Good, incorrect -> Again) and the
    GradeBar is still shown so the user may refine to Hard/Easy.
    (Chosen behavior: *auto decides, manual override.*)
- **Per-type graders** live in the card registry:
  - mcq: submitted set === correct set
  - ordering: submitted order === stored order
  - matching: all pairs correct
  - codeCompletion: `normalize(response) in solutions`
- **Session state machine:** `Presenting -> Answered -> Scheduled -> Next`.
  On Scheduled: write `ReviewLog`, update `card.scheduling`.
- **Undo:** keep previous `SchedulingState` + last log id in session state (one step).
- **Queue:** `getDue({ now })` -> due cards first, then new up to a daily cap (setting).
- **Stats are derived from `ReviewLog`** (streak, reviews/day, retention %,
  per-deck mastery, due forecast). Nothing denormalized.

---

## 7. Frontend Component Hierarchy

Route-level pages orchestrate data; presentational components are dumb.
A **card registry** maps `type -> { Question, Answer, Editor, grade }`.
`CardRenderer` and `CardEditorPage` look it up — adding a card type is one folder
plus one registration, no scattered `switch` statements.

```
App
  AppShell (nav, theme, responsive: desktop sidebar <-> mobile bottom nav)
  Pages: Dashboard, ReviewSession, Decks/DeckDetail, CardBrowser,
         CardEditor, DraftInbox, Stats, Settings
  Card system: CardRenderer -> renderers/<type>, CardEditorRegistry,
               ReviewSession -> GradeBar / AutoGradeResult
  Shared: CodeView, CodeEditor (CM6), MarkdownView, TagInput, DeckSelect,
          ui/* (shadcn), ThemeProvider
```

Dark mode via Tailwind + ThemeProvider. Syntax highlighting + editing via CodeMirror 6.

**Reveal interaction:** self-graded cards (basic, codeReading, bugFinding) use a
**flip-to-reveal** animation (tap card -> 3D rotate to answer -> grade bar appears).
Cards with tall code snippets fall back to a smooth slide/expand reveal, since a 3D
flip is awkward for long content on mobile. Finalized per-type in M3.

---

## 8. Folder Structure

```
src/
  app/            bootstrap: providers, router, theme
  components/     shared presentational (ui/, code/, markdown/, layout/)
  features/
    cards/        types/, registry/, renderers/<type>/, CardRenderer, CardEditorPage, CardBrowserPage
    review/       ReviewSession, GradeBar, session store, queue
    decks/
    drafts/       DraftInbox, capture, convert-to-card
    stats/
    settings/     theme, scheduler params, import/export UI
  domain/         PURE TS: scheduling/, grading/, search/, io/
  data/           repository.ts, dexie/, supabase/ (later), index.ts (factory)
  hooks/          TanStack Query hooks over the repository
  lib/            id(), date, cn()
  main.tsx
```

---

## 9. Deployment

Static build -> Cloudflare Pages / Vercel / Netlify (free). Installable PWA with
offline support (`vite-plugin-pwa`). Supabase free tier added later behind the seam.

---

## 10. Roadmap

| # | Milestone | Deliverable |
|---|---|---|
| M0 | Scaffold | Vite+TS+React, Tailwind, shadcn/ui, Router, lint/format, Vitest, blank PWA deployed |
| M1 | Data seam + Basic card | Repository iface, DexieRepository, Query hooks, full CRUD/view for Basic |
| M2 | Review engine | FSRS wrapper, queue, ReviewSession state machine, GradeBar, ReviewLog, undo |
| M3 | All card types | Renderers/editors/graders for the other 6 via registry; CodeMirror; auto+override |
| M4 | Organization | Decks, tags, CardBrowser search/filter, suspend |
| M5 | Draft inbox | Quick capture, triage, convert-to-card |
| M6 | Portability + offline | JSON import/export (schema-versioned), PWA offline polish |
| M7 | Insight + polish | Stats page, dark-mode pass, mobile/a11y QA |
| M8 | Supabase (optional) | Auth, SupabaseRepository, RLS, migrate via import/export |

M0->M1->M2->M3 strictly sequential. M4/M5/M6/M7 reorderable. M8 stands alone.

---

## 11. Risks / Deferred

- **Code auto-validation** is normalized-string-match only in v1; real execution
  (Pyodide / WASM sandbox) deferred. Manual grading always available.
- **Offline-write sync** is the hard part of M8; start read-mostly online.
- **jsonb queryability:** promote fields to columns only if analytics demand it.

---

## 12. Locked Decisions

- Code library: **CodeMirror 6 only** (display + edit).
- Auto-grading UX: **auto decides pass/fail, manual override via GradeBar**.
- Scheduler: **FSRS (`ts-fsrs`)**.
- Storage now: **Dexie/IndexedDB** behind a Repository seam; **Supabase** later.
- Card modeling: **discriminated union**, markdown rich text, reusable `CodeBlock`.
- Drafts: **separate entity** that converts to a Card.
