> Saved verbatim as provided to the project (via ChatGPT, following the redesign brief written earlier in this project). Some special characters (em dashes, curly quotes) may show encoding artifacts (e.g. "â") from the original paste — preserved as received rather than guessed at, so this stays a faithful record of the source. Referenced by `itera-repository-audit.md`, `itera-redesign-plan.md`, `itera-decisions.md`, and `itera-migration-plan.md`.

# Itera — Master Product, UX, Visual Design, and Implementation Specification

**Document role:** Complete source of truth for redesigning and improving the Itera application.

**Primary consumer:** A coding/design model such as Claude working directly on the Itera repository.

**Required behavior of the consumer:** Read this entire document before making architectural or visual changes. Treat the decisions marked **LOCKED** as authoritative. Make routine implementation and design decisions autonomously. Ask the product owner only when a decision changes core scope, data ownership, sync/privacy, payments, destructive migrations, or the locked ontology.

**Core instruction:** Do not cosmetically reskin the existing interface. Build the redesigned product structure and visual system as a new implementation, reusing only valid domain logic, persistence, routing, and scheduler code after auditing them.

---

# 1. Executive summary

Itera is a local-first spaced-repetition learning application designed primarily for software engineers and technical learners. It is similar in purpose to Anki, but it is intentionally designed around code-heavy learning, technical recall, programming concepts, compilers, systems, algorithms, databases, and other software-engineering subjects.

The product lets users:

1. Organize learning material into nested Collections and focused Decks.
2. Create Cards using six interaction types.
3. Generate Study Sessions from due Cards or selected Decks/Collections.
4. Review Cards in a focused, distraction-free mode.
5. Rate recall quality so an FSRS-based scheduler can determine the next review.
6. Track activity, retention, consistency, and difficult material.
7. Import and export content through versioned JSON.

The redesign must feel:

- energetic without being loud
- technically credible without looking like a terminal
- clean without becoming sterile
- motivating without childish gamification
- distinctive without forcing the logo into every object
- modern without resembling a generic AI-generated SaaS dashboard

The desired outcome is a product that feels specifically built for learning technical material, not a generic productivity application with flashcards added later.

---

# 2. Operating instructions for the implementation model

## 2.1 What to do

When given repository access:

1. Audit the existing application before rewriting it.
2. Identify which parts should be retained, migrated, rewritten, or deleted.
3. Preserve user content and review history wherever technically possible.
4. Implement the new design in isolated preview routes or a parallel feature area.
5. Reuse the real domain components in previews rather than building static mockups that will later be discarded.
6. Start with the shared Review foundation, then Card interactions, Create/Edit, Library/Deck, Today, Progress, onboarding, and responsive behavior.
7. Keep this document mirrored inside the repository, for example at `docs/itera-master-spec.md`.
8. Record meaningful deviations from this specification in a short decision log.

## 2.2 What not to do

Do not:

- preserve the old page layout merely because it already exists
- create another generic dashboard
- expose every feature simultaneously
- place sidebars and analytics around the active Review card
- use large gradients, glassmorphism, or random colorful category tiles
- make all objects large rounded rectangles
- use the Itera stacked-card motif everywhere
- turn the application into an IDE or terminal emulator
- add AI as a core dependency
- add Marketplace, Roadmaps, cloud sync, or semantic code execution during the MVP redesign
- ask for approval for every spacing, copy, icon, or minor component decision

## 2.3 When explicit product-owner input is required

Ask only when deciding:

- account and cloud-sync architecture
- payments, Marketplace, or commercial publishing
- privacy-sensitive telemetry
- destructive or irreversible data migration
- real compilation/execution of learner code
- major changes to the Collection/Deck/Card ontology
- a major rebrand or replacement of the logo/colors
- mobile-platform technology if the repository does not already determine it

---

# 3. Product vision and emotional target

## 3.1 Product thesis — LOCKED

> Itera should feel energetic, motivating, carefully designed, logically usable, and visibly distinctive, without becoming childish, corporate, sterile, gimmicky, or overdesigned.

## 3.2 Product personality

- **Vibe:** energetic and motivating
- **Polish:** carefully product-crafted
- **Identity strength:** recognizable but controlled
- **Gamification:** subtle and secondary to learning
- **Density:** medium by default; compact mode may come later
- **Technical character:** code is first-class, but the interface remains approachable

## 3.3 What the interface should communicate

- "I know what to do next."
- "This application understands technical study."
- "My learning material is organized without feeling like a file manager."
- "Review is focused and calm."
- "Progress is visible without the product nagging me."
- "The software is serious, but not dull."

## 3.4 Explicitly rejected styles

Avoid all of the following:

1. Corporate productivity suite
2. Admin or analytics dashboard
3. Children's educational application
4. Hacker-terminal cliché
5. Sterile academic database
6. Overdesigned lifestyle application
7. Generic AI-startup interface

Specific anti-patterns:

- purple/blue gradient backgrounds
- floating glass panels
- excessive shadows and glows
- giant rounded cards for every section
- nested boxes with no semantic purpose
- excessive pills and chips
- rainbow Deck/Collection colors
- fake code-terminal decoration
- mascot-based gamification
- coins, gems, XP explosions, confetti as the default
- every metric receiving equal visual weight
- large "AI" buttons or AI as the primary workflow

---

# 4. Brand system

## 4.1 Name

**Itera**

The name evokes iteration, repeated learning, progression, and technical process.

## 4.2 Logo — LOCKED

The logo is composed of overlapping flashcard-like shapes. The negative space suggests programming brackets or angle-bracket syntax.

The logo represents:

- flashcards
- repetition
- recursion
- layered knowledge
- progression
- software stacks
- programming syntax

Use the logo:

- in the main application navigation
- in onboarding and launch contexts
- within the Today session hero when appropriate
- in completion or branded transition moments

Do not use the logo or stacked-card motif:

- as every Deck cover
- behind every card
- inside Review content
- as repetitive decoration
- in places where it competes with learning material

The failed design pattern to avoid is: "Look, here are more stacked cards because the logo has stacked cards." The motif must appear only when it has semantic meaning.

## 4.3 Locked colors

```css
--itera-navy: #1E293B;
--itera-orange: #FF6902;
```

Recommended implementation palette:

```css
--canvas: #F6F7F9;
--surface: #FFFFFF;
--surface-subtle: #F9FAFB;
--ink: #172033;
--ink-brand: #1E293B;
--muted: #64748B;
--muted-light: #94A3B8;
--border: #E3E7ED;
--border-strong: #CBD3DE;

--orange: #FF6902;
--orange-hover: #EA5F00;
--orange-active: #D95700;
--orange-soft: #FFF2E8;
--orange-softer: #FFF8F3;

--navy-soft: #EEF2F7;
--selection-soft: #F2F6FC;
--selection-border: #9CB4DB;

--success: #15803D;
--success-soft: #ECFDF3;
--error: #C2413A;
--error-soft: #FEF2F2;
--warning: #B45309;
--warning-soft: #FFF7ED;
```

Exact neutrals may be adjusted slightly to match the existing rendering environment. Preserve the emotional relationship: navy is the foundation, white and cool gray create space, orange provides energy.

## 4.4 Orange usage rule — LOCKED

Orange is a strategic signal, not theme paint.

Use orange for:

- primary actions
- active navigation underline or focus marker
- the current important metric
- session progress or momentum accents
- small branded focus details
- selected key highlights

Do not make all of these orange simultaneously:

- every icon
- every progress bar
- every Card type
- every chart
- every tag
- every row action
- every metric

A useful rule: in most screens, the eye should find one primary orange action and no more than two or three minor orange accents.

## 4.5 Typography — LOCKED

```text
UI/body:        Inter
Large display:  Inter Tight, used sparingly
Code:           JetBrains Mono
```

Guidelines:

- Most headings use Inter.
- Inter Tight appears only in large, expressive moments such as the Today greeting or session-completion title.
- Monospace is reserved for code, keyboard shortcuts, and selected technical metadata.
- Do not mix several decorative fonts.
- Hierarchy should come from type scale, weight, spacing, and composition more than containers.

Suggested desktop scale:

```css
--text-xs: 12px;
--text-sm: 14px;
--text-md: 16px;
--text-lg: 18px;
--text-xl: 22px;
--text-2xl: 28px;
--text-3xl: 36px;
--text-display: clamp(38px, 5vw, 58px);
```

Suggested line heights:

```text
UI labels:     1.2–1.3
Body:          1.45–1.6
Large titles:  1.05–1.2
Code:          1.5–1.7
```

## 4.6 Shape language — LOCKED

The shape language is **structured softness**.

Recommended radii:

```css
--radius-code: 8px;
--radius-control: 9px;
--radius-card: 14px;
--radius-dialog: 16px;
--radius-pill: 999px; /* only for true pills, tags, and small labels */
```

Rules:

- Do not round every object equally.
- Code surfaces remain more rectangular.
- Tables/lists often use open rows and separators instead of one container per row.
- Use rounded corners where they signal an interactive or semantic object.
- Do not nest decorative containers.

Valid nesting example:

```text
Review flashcard
└── code block
```

Invalid nesting example:

```text
Dashboard panel
└── statistics card
    └── metric card
        └── label pill
```

## 4.7 Shadows and depth

Use shadows sparingly.

Recommended:

```css
--shadow-card: 0 12px 30px rgba(23, 32, 51, 0.08),
               0 2px 6px rgba(23, 32, 51, 0.05);
--shadow-float: 0 18px 50px rgba(23, 32, 51, 0.12);
```

Main Review cards may use a subtle shadow. Most Library rows should not.

---

# 5. Spacing, grid, and responsive system

## 5.1 Spacing scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

Prefer larger gaps between sections and smaller gaps inside a semantic object.

## 5.2 Breakpoints

Adapt these to the existing stack, but preserve behavior:

```text
Mobile:   < 768px
Tablet:   768–1199px
Desktop:  1200–1599px
Wide:     ≥ 1600px
```

## 5.3 Page widths

```text
Global app content:     max 1440–1520px
Focused Deck content:   max 1200–1320px inside shell
Review content:         max 1040–1120px
Editor + preview:       max 1440px
Text-heavy panel:       max 760–840px
```

## 5.4 Top bars

```text
Global app top navigation: 68–72px desktop
Review top bar:             60–64px desktop
Mobile top bar:             56–60px
```

---

# 6. Product information architecture

## 6.1 Global navigation — LOCKED

Desktop structure:

```text
[Itera]       Today       Library       Progress
                                      Search   + Create   Profile
```

Settings belongs under Profile, not as a permanent top-level destination.

Top-level destinations:

### Today

The next-action learning hub.

### Library

Collections, Decks, Cards, search, filters, drafts, archived/suspended content, imports, and management.

### Progress

Activity history, consistency, retention, streaks, review history, and difficult material.

### Create

Global creation action. Possible menu:

```text
New Card
New Deck
New Collection
Import
```

## 6.2 Not top-level

- Review is a mode entered from Today, Deck, Collection, or a configured session.
- Settings lives under Profile.
- Browse and Decks merge into Library.
- Stats becomes Progress.
- Roadmaps are future scope.
- Marketplace is future scope.

---

# 7. Domain ontology — LOCKED

## 7.1 Core structure

```text
Library organization:
Collection → nested Collection / Deck

Learning content:
Deck → Cards

Learning runtime:
Study Session → generated ordered queue of Cards

Per-user learning data:
CardState + ReviewEvent
```

Core entities:

1. Collection
2. Deck
3. Card
4. StudySession
5. CardState
6. ReviewEvent
7. Tag
8. Local Asset, when media support is introduced

## 7.2 Collection

A Collection is a neutral organizational container.

A Collection may contain:

- nested Collections
- Decks

Example:

```text
C++
└── Fundamentals
    ├── Declarations and Definitions
    ├── Type Deduction
    └── Storage Duration
```

Rules:

- Collections may nest.
- Collections do not contain Cards directly.
- Collections have no scheduling state.
- Collections should not look like yellow folders or Windows Explorer.
- Collections remain visually quiet.

## 7.3 Deck

A Deck is Itera's central persistent learning object.

A Deck:

- contains Cards directly
- represents one coherent learnable subject
- may be studied independently
- may later be shared, published, purchased, or referenced by a Roadmap

Decks may **not** contain other Decks.

Do not add Section as a first-class MVP entity. If future evidence proves internal grouping necessary, add a lightweight CardGroup later.

## 7.4 Topic

Topic is not a first-class structural entity.

Use:

- Collection for hierarchical organization
- Deck for a focused learning subject
- Tag for cross-cutting labels
- "topic" only as natural UI wording or analytics language

## 7.5 Card ownership

For MVP, each Card belongs to exactly one Deck.

Cards may be moved or duplicated. Do not implement shared Card references across Decks yet.

## 7.6 Content and learning-state separation

Keep separate:

```text
Card       = content
CardState  = current user scheduling state
ReviewEvent = immutable history
```

This separation is mandatory for future shared or purchased Decks.

---

# 8. Card model and runtime taxonomy

## 8.1 Final runtime types — LOCKED

```text
Recall
Multiple Choice
Write Code
Ordering
Matching
Walkthrough
```

Migration from the old eight-type system:

```text
Basic         → Recall
Code Reading  → Recall
Bug Finding   → Recall
MCQ           → Multiple Choice
Completion    → Write Code
Ordering      → Ordering
Matching      → Matching
Story         → Walkthrough
```

## 8.2 Why the taxonomy changed

The old system mixed presentation with behavior.

Basic, Code Reading, and Bug Finding all behave like this:

```text
Show prompt
→ learner recalls mentally
→ reveal answer
→ learner self-rates
```

Code is content, not a separate interaction. Therefore all three become Recall.

## 8.3 Recommended TypeScript model

Adapt names to the project. The examples use TypeScript because the application is a web application; do not change the project framework solely to match these examples.

```ts
export type RichContent = {
  format: "markdown";
  value: string;
};

export type Card = {
  id: string;
  schemaVersion: number;
  deckId: string;
  prompt: RichContent;
  tip?: RichContent;
  explanation?: RichContent;
  interaction: CardInteraction;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type CardInteraction =
  | RecallInteraction
  | MultipleChoiceInteraction
  | WriteCodeInteraction
  | OrderingInteraction
  | MatchingInteraction
  | WalkthroughInteraction;
```

Do not create `presentationType: text | code | image`. Rich content may contain prose, code, tables, links, and later images simultaneously.

## 8.4 Recall authoring presets

The Create experience may offer:

- Standard question
- Code reading
- Find the bug
- Predict output
- Explain code

These are presets only. They all persist as `interaction.type === "recall"`.

An optional `authoringPreset` metadata field is acceptable, but it must not control scheduling or Review rendering.

---

# 9. Study Session and scheduler model

## 9.1 Study Session

A StudySession is temporary and generated.

Potential sources:

- all due Cards
- one Deck
- several Decks
- one Collection
- custom filters
- future Roadmap node

Suggested model:

```ts
export type StudySession = {
  id: string;
  source: SessionSource;
  cardIds: string[];
  currentIndex: number;
  startedAt: string;
  completedAt?: string;
  goal?: {
    cardCount?: number;
    targetMinutes?: number;
  };
};
```

## 9.2 CardState

Suggested fields depend on the FSRS library:

```ts
export type CardState = {
  cardId: string;
  dueAt: string;
  state: "new" | "learning" | "review" | "relearning";
  stability?: number;
  difficulty?: number;
  scheduledDays?: number;
  elapsedDays?: number;
  repetitions: number;
  lapses: number;
  suspended: boolean;
  buried: boolean;
  lastReviewedAt?: string;
};
```

## 9.3 ReviewEvent

ReviewEvent is immutable.

```ts
export type ReviewEvent = {
  id: string;
  userId?: string;
  cardId: string;
  sessionId: string;
  interactionType: CardInteraction["type"];
  reviewedAt: string;
  rating: "again" | "hard" | "good" | "easy";
  objectiveResult?: ObjectiveResult;
  responseDurationMs?: number;
  previousState: CardState | null;
  resultingState: CardState;
  metadata?: Record<string, unknown>;
};
```

Walkthrough step outcomes may live in `metadata` initially.

## 9.4 Correctness versus FSRS rating — LOCKED

Objective correctness and recall quality are different.

```text
Correct answer does not automatically mean Good.
Incorrect answer does not automatically mean Again.
```

The learner always chooses Again, Hard, Good, or Easy after seeing feedback.

The application may later recommend a rating, but the recommendation must remain overridable.

## 9.5 Scheduler boundary

Review UI must not call the FSRS library directly.

Use a domain service:

```ts
export type SubmitReviewCommand = {
  cardId: string;
  sessionId: string;
  rating: "again" | "hard" | "good" | "easy";
  objectiveResult?: ObjectiveResult;
  shownAt: string;
  answeredAt: string;
  ratedAt: string;
};

export interface ReviewService {
  submit(command: SubmitReviewCommand): Promise<{
    event: ReviewEvent;
    nextState: CardState;
  }>;
}
```

Audit the current FSRS implementation. It was generated by AI and must not be trusted without verification.

---

# 10. Shared interaction semantics

## 10.1 Tip versus Explanation — LOCKED

### Tip

A Tip helps the learner reach the answer.

- optional
- appears before reveal/submission
- displayed directly below the active Card
- should be easy to find
- may be collapsed by the learner, but should not be hidden in a side panel

### Explanation

An Explanation adds context after the answer/result.

- optional
- separate from the answer
- appears below the Card after reveal/submission
- appears before FSRS rating controls

State transition:

```text
Before answer:
Active Card
Tip, if available

After answer:
Answer/result
Explanation, if available
Again / Hard / Good / Easy
```

## 10.2 Shared Review state machine

```text
presenting
  ├── optional tip visible/hidden
  └── user reveals or submits
        ↓
feedback
  ├── answer/result visible
  ├── explanation visible if present
  └── user rates recall
        ↓
submitting
        ↓
transitioning to next Card
```

For automatically validated Cards, the first submitted response is the scored response. The learner may inspect or experiment afterward, but the initial result remains recorded.

## 10.3 Timing

Record useful timing without silently changing the FSRS rating.

Examples:

- prompt-to-reveal
- prompt-to-submit
- feedback-to-rating
- total interaction duration

---

# 11. Golden screen blueprint: global application shell

## 11.1 Desktop shell

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Itera logo]       Today      Library      Progress     Search  + Create  ⚙ │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Main page content                                                           │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

Visual behavior:

- white or near-white top bar
- subtle bottom border
- active destination receives a thin orange underline or branded focus marker
- no permanent dark header
- logo at left, compact and crisp
- Profile at far right
- top navigation is calm and horizontal

## 11.2 Mobile shell

Use a compact top bar plus bottom navigation or another platform-appropriate pattern.

Priorities:

- Today
- Library
- Progress
- Create

Do not force the desktop left sidebar onto mobile.

---

# 12. Golden screen blueprint: Today

## 12.1 Purpose

Today answers:

> What is the most useful learning session I can do right now?

It must not feel like an analytics dashboard.

## 12.2 Desktop hierarchy

```text
Global navigation

Good morning, Fica.
Build a little momentum today.

┌───────────────────────────── Suggested session hero ───────────────────────┐
│ clean Itera Stack object          TODAY'S SESSION                          │
│                                   24 Cards · approximately 15 minutes      │
│                                   C++ · Type deduction · Storage duration  │
│                                   [ Start session ]                        │
│                                   Adjust session                           │
└───────────────────────────────────────────────────────────────────────────┘

Momentum
- 12-day streak
- 3 of 5 weekly sessions
- recent retention or recall summary

Continue Learning
C++ Fundamentals            12 due                         Continue →
Compiler Architecture        7 due                         Continue →
MLIR                         5 due                         Continue →
```

## 12.3 Visual rules

- The suggested session is the dominant object.
- Use the clean Itera Stack here because a Study Session represents layered review material.
- Do not use a cartoon playing-card stack.
- Do not place the full activity heat map on Today.
- Do not lead with "385 overdue" in giant type.
- Backlog may be acknowledged quietly: "385 Cards are currently due. Today's suggested session: 24."
- Momentum should be restrained, not a badge collection.
- Continue Learning should use clear rows or quiet modules, not a wall of large Deck cards.

## 12.4 Adjust session

Allow:

- Card count
- estimated duration
- Deck/Collection sources
- due-only versus mixed learning
- optional focus filters

Use a drawer, popover, or focused setup screen. Keep it lightweight.

## 12.5 New-user Today

When there is no content:

```text
Welcome to Itera.
Create or import your first Deck, then complete a short guided Review.

[ Create a Deck ]   [ Import JSON ]
```

Do not show empty analytics panels.

---

# 13. Golden screen blueprint: Library browser

## 13.1 Default structure — LOCKED

```text
Global navigation
┌──────────────────────┬───────────────────────────────────────────────────┐
│ Collections          │ Search Decks...        Sort / filters   + New Deck │
│                      │                                                      │
│ All Decks            │ C++ / Fundamentals                                  │
│ C++                  │                                                      │
│   Fundamentals       │ Deck row                                             │
│   Templates          │ Deck row                                             │
│   STL                │ Deck row                                             │
│ Compilers            │ Deck row                                             │
│ MLIR                 │                                                      │
│ System Design        │                                                      │
│ Unfiled Decks        │                                                      │
└──────────────────────┴───────────────────────────────────────────────────┘
```

This is a two-pane browser.

Do not show Collection sidebar + Deck list + full Deck page permanently by default. That three-column structure felt clunky and overly managerial.

## 13.2 Collection sidebar

- local to Library only
- quiet text hierarchy
- indentation and subtle branches are acceptable
- no yellow folder art
- no large colorful icons
- selected item may use a pale neutral/orange tint and a small orange focus marker
- counts are muted
- Unfiled Decks appears near the bottom

## 13.3 Deck rows

A Deck row may show:

- restrained square Deck mark
- title
- Card count
- last studied
- mastery/progress rail
- due count
- overflow menu

Deck rows should not become huge tiles unless a future grid mode is deliberately chosen.

Do not use unrelated rainbow Deck icons. A restrained Deck-cover system may be designed later.

---

# 14. Golden screen blueprint: focused Deck page

## 14.1 Navigation behavior

When a Deck opens, the Deck list disappears.

```text
Collection navigation | Full Deck page
```

An optional three-pane split view may be implemented later as a power-user toggle.

## 14.2 Approved desktop composition

```text
Global navigation
┌──────────────────────┬───────────────────────────────────────────────────┐
│ Collection tree      │ Library > C++ > Fundamentals                        │
│                      │                                                      │
│                      │ [square C++ mark]  Declarations and Definitions      │
│                      │                    Short description                 │
│                      │                    48 Cards · 23 due · 2h ago · 68%   │
│                      │                                [ Study now ]         │
│                      │                                [ Add Card ]          │
│                      │                                                      │
│                      │ Cards     Insights                                   │
│                      │ ─────                                               │
│                      │ Search Cards...  Type  Status  Sort                   │
│                      │                                                      │
│                      │ Card rows                                            │
└──────────────────────┴───────────────────────────────────────────────────┘
```

## 14.3 Deck header

Visible by default:

- breadcrumb
- restrained square Deck mark
- title
- short description
- total Cards
- due count
- last studied
- mastery/progress
- Study now
- Add Card
- overflow/Deck settings

The square Deck mark is accepted for now. Do not force stacked-card artwork.

Use open spacing rather than heavy metric boxes.

## 14.4 Cards tab

Default tab.

Controls:

- search
- type filter
- status filter
- sort
- optional list/compact toggle

Row content:

```text
Card title         quiet tags        Type        Status        Due       ⋯
```

Clicking the row opens preview/edit. Management actions live in the overflow menu.

## 14.5 Insights tab

Move secondary analytics here:

- progress over time
- Card-state breakdown
- difficult Cards
- recent review activity
- interaction-type distribution only if genuinely useful

The large card-type donut from an early mockup should not be a primary visualization. It occupies too much space for low-value information.

---

# 15. Golden screen blueprint: Review shell

## 15.1 Locked composition

Review is minimal and immersive.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Exit session                      7 of 23                    Space to flip │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                      Large centered interaction Card                        │
│                                                                             │
│                      Tip before answering, if any                           │
│                                                                             │
│                      Explanation after answering, if any                    │
│                      Rating controls after answering                        │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

Never add:

- global navigation
- Itera logo
- left sidebar
- upcoming queue
- Card information panel
- session statistics panel
- spaced-repetition explanation panel
- permanent Deck metadata

Those were tested and rejected because they distract from recall.

## 15.2 Sizing

Desktop:

- content max width around 1040–1120px
- Card width roughly 900–1050px depending on content
- large surrounding whitespace
- Card may grow vertically

Mobile:

- Card nearly full width
- horizontal page padding 16px
- keyboard hints hide or simplify
- rating controls may use a 2×2 grid

---

# 16. Golden interaction blueprint: Recall

## 16.1 Front state

```text
Small "Recall" label close to top edge

What is a declaration?
Supporting prompt text or code

Small flip indicator near bottom edge
Click the Card or press Space to flip
```

The Card remains a literal flashcard: a rectangle with gently curved edges.

## 16.2 Flip behavior

- clicking the Card flips it
- Space flips it when focus is not inside another input
- restrained 3D animation
- 320–420ms
- no bounce
- preserve Card size during animation when possible
- if front/back sizes differ significantly, animate height carefully or use the larger measured height
- reduced motion replaces the 3D flip with a quick crossfade

## 16.3 Back state

```text
Small "Recall" label

Answer
Optional code/example
```

Below the Card:

```text
Explanation
Additional information explaining why the answer is correct.

How well did you recall this?
Again      Hard      Good      Easy
```

## 16.4 Rating controls

- four clear choices
- keyboard shortcuts 1, 2, 3, 4
- intervals may appear as quiet secondary labels if the scheduler provides trustworthy values
- avoid oversized emotion faces or playful icons
- use restrained semantic color; do not make the whole section a rainbow

---

# 17. Golden interaction blueprint: Multiple Choice

## 17.1 Unanswered state

```text
Small "Multiple Choice" label

Which of the following C++ statements are declarations?
Select all that apply.

[ option row ]
[ option row ]
[ option row ]
[ option row ]

Submit answer
```

## 17.2 Selection behavior — LOCKED

Do not use literal visible checkboxes/radio inputs as the main visual.

Each option is a full tappable row.

Unselected:

- white or very subtle surface
- neutral border

Selected:

- light cool/navy-tinted background
- stronger selection border
- optional compact check mark inside the row

Clicking a selected row again deselects it for multiple-selection Cards.

For single-selection Cards, selecting another row moves the selection.

The actual accessible input may remain in the DOM but should be visually represented by the row state.

## 17.3 Submitted state

Show calmly:

- correct selected answers
- incorrect selected answers
- missed correct answers
- concise result summary

Then below:

- Explanation if present
- FSRS rating controls

Do not automatically map result to rating.

---

# 18. Golden interaction blueprint: Write Code

## 18.1 Unanswered state

```text
Small "Write Code" label

Write a function that returns the sum of all elements in a std::vector<int>.
Supporting instruction

┌───────────────── code editor ─────────────────┐
│ read-only starter code                      │
│ darker editable/reveal region               │
│ read-only closing code                      │
└─────────────────────────────────────────────┘

Submit answer
```

## 18.2 Code presentation

- JetBrains Mono
- syntax highlighting
- optional line numbers
- language selector/indicator
- editor-like behavior without full IDE chrome
- the learner's editable lines use a slightly darker background than read-only code
- the editable region remains visibly distinct in the revealed-answer state

## 18.3 MVP validation

Normalize before comparison:

1. normalize line endings
2. trim outer whitespace
3. remove trailing whitespace per line
4. compare against one or more accepted answers
5. support optional case sensitivity for non-code uses

Do not compile or execute code in MVP.

## 18.4 Feedback state

Preserve:

- learner answer
- accepted/incorrect status
- expected answer or diff where useful
- visually highlighted target region

Then show Explanation and rating controls.

---

# 19. Golden interaction blueprint: Ordering

## 19.1 Unanswered state

```text
Small "Ordering" label

Put the C++ translation phases in order.
Drag items into the correct sequence.

[ Linking                                      grip ]
[ Lexing                                       grip ]
[ Compilation                                  grip ]
[ Execution                                    grip ]
[ Parsing                                      grip ]

Submit answer
```

## 19.2 Interaction requirements

- large draggable rows
- subtle six-dot grip on the right
- touch-friendly
- keyboard reordering controls
- visible drag placeholder
- auto-scroll when dragging near container edges

## 19.3 Feedback

- show which positions are correct
- show expected sequence
- use restrained success/error marks
- do not flood entire rows with saturated colors
- show Explanation and rating controls

---

# 20. Golden interaction blueprint: Matching

## 20.1 MVP layout

```text
Small "Matching" label

Match each keyword to its meaning.

const     ↔     cannot be modified
extern    ↔     declared in another translation unit
static    ↔     storage/linkage depends on context

Submit answer
```

## 20.2 Interaction direction

- two columns on desktop
- source items stay fixed
- learner selects or assigns target items
- matched pairs use calm connecting indicators or paired selected tiles
- do not make it look like a paper worksheet
- on mobile, use a stepwise pairing flow or stacked assignment controls

## 20.3 Three-column future case

The data model should allow a relationship group with more than two values, but implement two-column UI first unless current data requires three.

## 20.4 Feedback

- indicate correct and incorrect relationships
- preserve the learner's submitted mapping
- show correct mapping
- store partial correctness
- show Explanation and rating controls

---

# 21. Golden interaction blueprint: Walkthrough

## 21.1 Purpose

A Walkthrough teaches reasoning across a shared scenario rather than testing an isolated fact.

Examples:

- C++ object lifetime and constructors/destructors
- assembly instruction to machine-code mapping
- compiler pipeline transformations
- execution trace
- ownership/lifetime changes
- protocol state transitions

## 21.2 Screen composition

```text
Small "Walkthrough" label
Step 3 of 5

Scenario context

┌───────────────── code block ──────────────────┐
│ lines 1–8                                   │
│ highlighted line 9                          │
│ lines 10–11                                 │
└─────────────────────────────────────────────┘

At this point, which constructor is called?

[ Base constructor ]
[ Derived constructor ]
[ Copy constructor ]
[ No constructor is called ]

Submit answer
```

The response rows use the same selected-row pattern as MCQ, not visible form checkboxes.

## 21.3 Lifecycle

- one Card
- multiple ordered steps
- one CardState
- one final FSRS rating
- per-step objective results stored in ReviewEvent metadata

## 21.4 MVP step types

Allow:

- Recall
- Multiple Choice
- short exact input

Do not implement arbitrary recursive Card composition.

---

# 22. Create and Edit experience

## 22.1 Create flow

```text
Choose interaction or preset
→ author content
→ preview actual Review component
→ save
```

## 22.2 Interaction chooser

Primary types:

- Recall
- Multiple Choice
- Write Code
- Ordering
- Matching
- Walkthrough

Recall presets:

- Standard question
- Code reading
- Find the bug
- Predict output
- Explain code

Use restrained list/modules with a small interaction sketch. Avoid a rainbow icon grid.

## 22.3 Shared editor shell

Desktop:

```text
Cancel / Back                 New Card                 Preview   Save
┌─────────────────────────────────────────────────────────────────┐
┌───────────────────────────────┬─────────────────────────────────────┐
│ Editor                      │ Live Review preview                  │
│                             │                                      │
│ Prompt                      │ Actual production interaction        │
│ Tip                         │ component, not a fake mockup         │
│ Explanation                 │                                      │
│ Tags                        │                                      │
│ Interaction fields          │                                      │
└───────────────────────────────┴─────────────────────────────────────┘
```

On smaller screens, Editor and Preview become tabs.

## 22.4 Shared fields

- Deck
- Prompt
- Tip
- Explanation
- Tags

## 22.5 Interaction fields

### Recall

- Answer
- optional authoring preset

### Multiple Choice

- selection mode: single/multiple
- options
- correct option IDs
- randomize option order

### Write Code

- language
- starter/read-only code
- editable region definition
- accepted answers
- normalization options

### Ordering

- items in authored correct order
- randomize presentation

### Matching

- source items
- target items
- correct relationships

### Walkthrough

- shared scenario/code
- ordered steps
- highlighted line ranges
- per-step prompt
- per-step response configuration

## 22.6 Editor principles

- direct, visual authoring
- avoid exposing raw JSON or schema concepts
- advanced settings collapsed
- local draft autosave where practical
- precise inline validation
- real preview
- same Markdown and code renderer as Review
- destructive actions confirmed

---

# 23. Progress experience

## 23.1 Purpose

Progress answers:

> What has my learning behavior and retention looked like over time?

It is separate from Today's next-action purpose.

## 23.2 Hierarchy

1. Activity heat map
2. Retention/recall trend
3. Streak and consistency
4. Session history
5. Difficult or weak Cards/Decks

Use one or two dominant visualizations, with supporting metrics around them.

Do not create six equal statistic cards.

## 23.3 Activity heat map

Data should derive from ReviewEvents or completed StudySessions.

Preferred default measure: completed reviews per day. A setting may later switch to sessions or minutes.

Color scale:

```text
none:        light neutral gray
low:         very pale orange
medium:      soft orange
high:        brand orange
exceptional: orange with restrained navy outline or marker
```

## 23.4 Empty Progress

```text
Your learning history will appear here after your first session.
[ Start a guided Review ]
```

---

# 24. Onboarding and empty states

## 24.1 Onboarding sequence

1. What are you learning?
2. How would you like to begin?
3. Choose a manageable daily target.
4. Complete a short guided Review.
5. Land on a useful Today screen.

Starting paths:

- create manually
- import JSON
- use a starter template
- paste content later

AI is not required.

## 24.2 Empty states to implement

- empty Library
- empty Collection
- empty Deck
- no Cards due
- first completed session
- successful import
- failed import
- suspended-only Deck
- no Progress history
- no search results

Each empty state must have one obvious primary action and no decorative dashboard clutter.

---

# 25. Local-first, import/export, and media

## 25.1 Local-first — LOCKED

Core features operate locally:

- Card authoring
- Review
- scheduling
- search
- history
- import/export
- previews
- local media where feasible

AI is optional future tooling, never a dependency.

## 25.2 JSON

JSON remains the canonical lossless format.

Requirements:

- explicit `schemaVersion`
- stable IDs
- Deck/Collection hierarchy
- Cards and interaction payloads
- optional inclusion of learning state/history depending on export mode
- migration functions between schema versions

Potential later formats:

- Markdown bundle
- CSV for simple Recall cards
- Anki package import
- archive with media
- Git-based Deck exchange

## 25.3 Media

Media support is not currently developed. When introduced:

- store local asset IDs rather than fragile absolute paths
- RichContent references assets
- export archives include media
- Review must work offline

---

# 26. Component architecture

## 26.1 Shell components

```text
AppTopNav
ProfileMenu
CreateMenu
LibrarySidebar
ReviewTopBar
PageHeader
```

## 26.2 Content components

```text
RichContentRenderer
MarkdownRenderer
CodeBlock
CodeEditor
KeyboardShortcut
Tag
ProgressRail
```

## 26.3 Review components

```text
ReviewSessionScreen
FlashcardSurface
TipPanel
ExplanationPanel
RatingControls
RecallReview
MultipleChoiceReview
WriteCodeReview
OrderingReview
MatchingReview
WalkthroughReview
```

## 26.4 Authoring components

```text
CardTypeChooser
CardEditorShell
RecallEditor
MultipleChoiceEditor
WriteCodeEditor
OrderingEditor
MatchingEditor
WalkthroughEditor
CardPreview
```

## 26.5 Library components

```text
CollectionTree
CollectionTreeItem
DeckList
DeckRow
DeckMark
DeckHeader
CardList
CardRow
DeckInsights
```

## 26.6 Progress components

```text
ActivityHeatmap
RetentionChart
ConsistencySummary
SessionHistory
WeakItemsList
```

## 26.7 Component-state requirement

Every interactive component defines:

- default
- hover
- pressed
- selected
- focus-visible
- disabled
- loading
- error
- success
- reduced-motion behavior

---

# 27. Motion and feedback

## 27.1 Motion language — LOCKED

**Quiet momentum**

Motion should imply forward progress without spectacle.

Use:

- clean Card transitions
- restrained progress animation
- Recall flip
- subtle selected-state changes
- smooth reordering
- calm completion transition

Avoid:

- bounce-heavy motion
- default confetti
- floating decorations
- large spring animations
- motion that delays learning

## 27.2 Timing guidance

```text
Hover/press:            100–160ms
Selection change:       140–200ms
Panel expand/collapse:  180–260ms
Recall flip:            320–420ms
Card-to-card transition:180–280ms
Completion transition:  350–600ms
```

Use easing similar to `cubic-bezier(0.2, 0.8, 0.2, 1)`.

---

# 28. Accessibility and keyboard behavior

## 28.1 General

- WCAG AA contrast for text and controls
- visible focus rings
- all Card interactions usable by keyboard
- screen-reader labels for Card type and state
- reduced-motion support
- no color-only correctness indicators
- touch targets at least 44×44px where practical

## 28.2 Review shortcuts

Recommended:

```text
Escape:       exit/pause session with confirmation
Space:        flip Recall Card
Enter:        submit active automatic interaction
1/2/3/4:      Again/Hard/Good/Easy after feedback
Arrow keys:   navigate MCQ options or ordering controls
```

Do not trigger shortcuts when focus is inside a text/code input unless explicitly intended.

## 28.3 Ordering accessibility

Provide buttons or keyboard commands to move an item up/down in addition to drag-and-drop.

## 28.4 Matching accessibility

Provide a listbox/assignment fallback for screen readers and small screens.

---

# 29. Responsive behavior

## 29.1 Library

Desktop:

```text
Collection sidebar | content
```

Tablet:

- collapsible Collection sidebar
- focused Deck content occupies most width

Mobile:

- Collection drill-down or drawer
- Deck page becomes one column
- metrics wrap
- filters become a sheet or horizontal scroll

## 29.2 Review

- remains one focused column on every device
- Card uses almost full mobile width
- code scrolls horizontally
- Tip/Explanation stack below
- rating controls become 2×2 or vertical
- Walkthrough code and choices remain legible

## 29.3 Create/Edit

Desktop: editor + preview split.

Mobile/tablet: Editor/Preview tabs.

## 29.4 Matching

Desktop: two columns.

Mobile: select a source, then choose a target; show completed pairs as stacked rows.

---

# 30. Implementation architecture

## 30.1 Architectural boundaries

Preserve clear layers:

```text
UI components
↓
Application/use-case services
↓
Domain models and scheduler boundary
↓
Repositories/persistence
```

Do not place FSRS calculations, database writes, and UI state inside one React component.

## 30.2 Suggested service boundaries

```ts
interface CardRepository {}
interface DeckRepository {}
interface CollectionRepository {}
interface ReviewEventRepository {}
interface CardStateRepository {}
interface StudySessionRepository {}
interface SchedulerService {}
interface ReviewService {}
interface ImportExportService {}
```

Adapt to the existing architecture rather than forcing unnecessary abstraction. The key requirement is separation of concerns.

## 30.3 Review UI state

Use an explicit reducer/state machine rather than scattered booleans.

Example:

```ts
type ReviewPhase =
  | { type: "presenting"; tipVisible: boolean }
  | { type: "submitting" }
  | { type: "feedback"; result?: ObjectiveResult }
  | { type: "rating"; result?: ObjectiveResult }
  | { type: "transitioning" };
```

## 30.4 Interaction render strategy

```tsx
function ReviewInteraction({ card }: { card: Card }) {
  switch (card.interaction.type) {
    case "recall":
      return <RecallReview card={card} />;
    case "multiple_choice":
      return <MultipleChoiceReview card={card} />;
    case "write_code":
      return <WriteCodeReview card={card} />;
    case "ordering":
      return <OrderingReview card={card} />;
    case "matching":
      return <MatchingReview card={card} />;
    case "walkthrough":
      return <WalkthroughReview card={card} />;
  }
}
```

Shared shell, Tip, Explanation, rating, and submission logic should not be duplicated across interactions.

---

# 31. Recommended interaction payloads

These schemas are a strong starting point, not a demand to rename existing project types unnecessarily.

## 31.1 Recall

```ts
export type RecallInteraction = {
  type: "recall";
  answer: RichContent;
  authoringPreset?:
    | "standard"
    | "code_reading"
    | "find_the_bug"
    | "predict_output"
    | "explain_code";
};
```

## 31.2 Multiple Choice

```ts
export type MultipleChoiceInteraction = {
  type: "multiple_choice";
  selectionMode: "single" | "multiple";
  randomizeOptions: boolean;
  options: Array<{
    id: string;
    content: RichContent;
    correct: boolean;
  }>;
};
```

## 31.3 Write Code

```ts
export type WriteCodeInteraction = {
  type: "write_code";
  language: string;
  starterCode: string;
  editableRegions: Array<{
    id: string;
    startLine: number;
    endLine: number;
  }>;
  acceptedAnswers: string[];
  comparison: {
    trimOuterWhitespace: boolean;
    normalizeLineEndings: boolean;
    ignoreTrailingWhitespace: boolean;
    caseSensitive: boolean;
  };
};
```

For a simpler implementation, one editable region is acceptable initially.

## 31.4 Ordering

```ts
export type OrderingInteraction = {
  type: "ordering";
  randomize: boolean;
  items: Array<{
    id: string;
    content: RichContent;
  }>;
  correctOrder: string[];
};
```

## 31.5 Matching

```ts
export type MatchingInteraction = {
  type: "matching";
  sources: Array<{ id: string; content: RichContent }>;
  targets: Array<{ id: string; content: RichContent }>;
  relationships: Array<{
    sourceId: string;
    targetId: string;
  }>;
};
```

## 31.6 Walkthrough

```ts
export type WalkthroughInteraction = {
  type: "walkthrough";
  scenario: RichContent;
  code?: {
    language: string;
    value: string;
  };
  steps: WalkthroughStep[];
};

export type WalkthroughStep = {
  id: string;
  focus?: {
    startLine: number;
    endLine: number;
  };
  prompt: RichContent;
  response:
    | { type: "recall"; answer: RichContent }
    | {
        type: "multiple_choice";
        selectionMode: "single" | "multiple";
        options: Array<{
          id: string;
          content: RichContent;
          correct: boolean;
        }>;
      }
    | {
        type: "exact_input";
        acceptedAnswers: string[];
      };
};
```

---

# 32. JSON export example

```json
{
  "schemaVersion": 2,
  "exportedAt": "2026-07-22T18:00:00Z",
  "collections": [
    {
      "id": "collection_cpp",
      "parentId": null,
      "name": "C++"
    },
    {
      "id": "collection_cpp_fundamentals",
      "parentId": "collection_cpp",
      "name": "Fundamentals"
    }
  ],
  "decks": [
    {
      "id": "deck_declarations",
      "collectionId": "collection_cpp_fundamentals",
      "title": "Declarations and Definitions",
      "description": "Understand how names are introduced and defined in C++."
    }
  ],
  "cards": [
    {
      "id": "card_declaration_1",
      "schemaVersion": 2,
      "deckId": "deck_declarations",
      "prompt": {
        "format": "markdown",
        "value": "What is a declaration?"
      },
      "tip": {
        "format": "markdown",
        "value": "Think about what introduces a name to the compiler."
      },
      "explanation": {
        "format": "markdown",
        "value": "A declaration informs the compiler that an entity exists and describes its type or signature."
      },
      "interaction": {
        "type": "recall",
        "authoringPreset": "standard",
        "answer": {
          "format": "markdown",
          "value": "A declaration introduces a name and tells the compiler about the type or signature of an entity."
        }
      },
      "tags": ["basics", "declaration"],
      "createdAt": "2026-07-20T10:00:00Z",
      "updatedAt": "2026-07-20T10:00:00Z"
    }
  ]
}
```

Learning state/history may be exported separately or included under an explicit `includeProgress` mode.

---

# 33. Migration plan from the current application

## 33.1 Audit first

Inspect:

- existing Card type definitions
- existing database/storage structure
- current review submission flow
- current CardState fields
- ReviewEvent/history implementation
- FSRS library and version
- JSON import/export format
- routing
- component organization
- tests

Classify every area:

```text
retain
migrate
rewrite
delete
```

## 33.2 Type migration

```text
basic          → recall + standard preset
code_reading   → recall + code_reading preset
bug_finding    → recall + find_the_bug preset
mcq            → multiple_choice
completion     → write_code
ordering       → ordering
matching       → matching
story          → walkthrough
```

## 33.3 Preserve history

Do not create new Card IDs merely because the type changes.

Preserve:

- Card IDs
- Deck ownership
- tags
- created/updated dates
- CardState
- ReviewEvents

Use a versioned migration with backup/export before destructive writes.

## 33.4 Tip/Explanation migration

If the old model has only `explanation`, keep it as Explanation.

Do not infer a Tip automatically unless content or old schema explicitly contains one.

## 33.5 Code fields

For Recall-based code-reading/bug-finding Cards, convert dedicated code fields into fenced Markdown or a compatible structured RichContent representation.

For Write Code, preserve structured starter code and accepted-answer fields.

---

# 34. Implementation sequence

## Phase A — Repository audit

Deliver:

- architecture summary
- retain/migrate/rewrite/delete table
- data-risk assessment
- FSRS audit
- migration proposal

## Phase B — Design tokens and preview infrastructure

Implement:

- CSS/design tokens
- typography
- preview routes
- representative seeded data

Suggested routes:

```text
/design-preview/today
/design-preview/library
/design-preview/deck
/design-preview/review/recall
/design-preview/review/mcq
/design-preview/review/write-code
/design-preview/review/ordering
/design-preview/review/matching
/design-preview/review/walkthrough
/design-preview/create/recall
```

## Phase C — Shared Card model and migration layer

Implement:

- six-type union
- RichContent
- schema versioning
- migration helpers
- Tip/Explanation fields

## Phase D — Review foundation

Implement in this order:

1. ReviewTopBar
2. Review state machine
3. FlashcardSurface
4. TipPanel
5. ExplanationPanel
6. RatingControls
7. ReviewService/scheduler boundary
8. Recall
9. Multiple Choice
10. Write Code
11. Ordering
12. Matching
13. Walkthrough

## Phase E — Create/Edit

- chooser
- shared shell
- real preview
- interaction editors in Review implementation order

## Phase F — Library and Deck

- Collection tree
- Deck list
- focused Deck page
- Cards tab
- Insights tab

## Phase G — Today

- suggested session hero
- session setup
- Momentum
- Continue Learning
- empty/new-user states

## Phase H — Progress

- activity heat map
- retention trend
- consistency
- history
- difficult material

## Phase I — onboarding and empty states

## Phase J — responsive/mobile

## Phase K — accessibility, performance, and cleanup

---

# 35. Acceptance criteria

## 35.1 Visual

- The application does not look like a generic SaaS dashboard.
- Navy and white form the visual foundation.
- Orange is restrained and purposeful.
- The logo appears meaningfully, not repetitively.
- Containers are used only for semantic objects.
- Code is pleasant to read and edit.
- Review is significantly calmer than Library and Today.

## 35.2 Product

- A new user understands the next action.
- A returning user can begin a session quickly.
- Collections and Decks feel conceptually different.
- Decks do not look like folders.
- Tips appear before answering.
- Explanations appear after answering.
- Recall literally flips.
- MCQ does not look like a browser form.
- Write Code clearly distinguishes editable/revealed lines.
- Ordering is usable with mouse, touch, and keyboard.
- Matching works on mobile.
- Walkthrough feels like a guided scenario.

## 35.3 Architecture

- Content and scheduling state remain separate.
- ReviewEvents are immutable.
- FSRS sits behind a service boundary.
- JSON is versioned.
- Existing review history is preserved through migration.
- Review components share shell, feedback, and rating logic.
- Authoring preview uses production Review components.

## 35.4 Accessibility

- keyboard-complete Review flow
- focus-visible states
- reduced-motion support
- sufficient contrast
- no color-only correctness feedback
- mobile touch targets

---

# 36. Deferred scope

Do not implement during the core redesign unless explicitly requested:

- Marketplace
- payments
- Roadmaps
- Deck publishing/version updates
- cloud sync/accounts
- collaborative Deck editing
- AI generation or grading
- semantic code equivalence
- code compilation/execution
- Debug simulation Card
- dark mode
- compact power-user density
- rich media authoring beyond basic local support
- three-column Matching UI unless current content requires it

The architecture should not block these features, but the MVP should not prebuild them.

---

# 37. Autonomous decision policy

The implementation model should decide without asking:

- exact spacing within the defined system
- precise icon choice
- hover/focus treatment
- responsive stacking
- minor empty-state copy
- filter arrangement
- validation copy
- subtle animation timing
- local component decomposition
- whether low-value analytics are collapsed or moved to Insights

The model should record assumptions in a concise repository document, not ask for approval repeatedly.

When uncertain, prefer:

1. focused over feature-dense
2. open space over another container
3. clear typography over decoration
4. local-first over network dependency
5. stable data migration over a clean rewrite
6. real production components over static mockup-only code
7. one dominant action per screen

---

# 38. Final directive to Claude or another implementation model

You are not being asked to invent a new visual direction. The visual and product direction is already established in this specification.

Your job is to:

1. Understand the current repository.
2. Map it to this product model.
3. Preserve valid data and domain behavior.
4. Replace the generic dashboard-oriented interface with the described Itera experience.
5. Build the redesign incrementally in preview routes.
6. Make reasonable decisions without requesting approval for routine details.
7. Surface only genuine blockers or major product trade-offs.
8. Deliver working screens and code, not another long speculative design essay.

The first concrete task after reading this document should be:

```text
Audit the repository and produce a concise implementation report:
- architecture findings
- current Card and scheduler model
- migration risks
- retain/migrate/rewrite/delete map
- proposed file/module changes
- first Review preview route to implement
```

Then begin implementation with the minimal Review shell and Recall interaction.
