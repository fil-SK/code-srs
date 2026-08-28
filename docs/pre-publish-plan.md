# Itera — Product UX & Visual Polish Audit

**No code was modified.** Everything below was read from the working tree on branch
`mvp_demo_cleaning` (2026-08-28), plus `docs/`. Findings are cited by file and line.

**Method note.** Plan mode is read-only, so this audit is *source-based*, not
browser-verified. Every claim is grounded in code or docs, not a screenshot. Items marked
**[verify]** should be confirmed in Chromium before you act on them.

---

## Context

Itera is close to first public exposure. The owner's report: *"it looks good, but it's one
level below something that feels exceptionally polished, memorable and production-ready —
and I can't say what's missing."*

That feeling is accurate, and it has specific, nameable causes in this codebase. This
document identifies them, ranks them, and ends with a one-week plan.

---

## The verdict, first

**You do not need substantial visual work. You need three things: systematisation,
finishing, and two non-visual fixes.**

The design direction is good and settled. The palette is right and should not change. The
typography is right. The IA is better than most shipped SRS apps. Three or four surfaces
are genuinely excellent.

But two answers matter more than the visual one:

> **1. The thing actually blocking validation is not visual.** Your early-access form
> throws away every email it receives. If you link that page publicly, a perfect UI
> converts nobody. (The empty web demo workspace is the same class of problem, and is
> **deferred by owner decision** — recorded in `docs/TODO.md`.)
>
> **2. Your design system exists in a document and in color tokens — but not in code.**
> There is no shared Button that everyone uses, no heading component, no card component,
> no empty-state standard, no loading standard. So every screen re-derives them slightly
> differently, and the accumulated drift is what your eye is reading as "not quite there."

The measured drift: **7 distinct primary-button paddings, 4 conflicting hover strategies
(two of which brighten in opposite directions), 6 one-off border radii, 5 different page
`<h1>` treatments, 4 metric type scales, 3 placeholder vocabularies, 5 empty-state
treatments, 3 scrim colors, and 3 `<kbd>` recipes.** No single screen reveals this. The eye
integrates it as incoherence.

So: **stop redesigning, start consolidating.** And ship.

---

## PASS 1 — What Itera is

- Light-only. Two layered token systems: general `:root` tokens re-pointed by
  `.itera-scope` (`apps/web/src/index.css`). Locked navy `#1e293b` + orange `#ff6902`.
  Inter + JetBrains Mono, self-hosted variable fonts.
- Three primary destinations: **Today · Library · Progress**. Review is a chrome-free
  top-level route. No global search or create — both deliberately removed.
- Six interaction types with shared behavior in `packages/core/src/interactions/`.
- Progress, Today, Library and Review are all real. Settings is 1-of-7 real.
- No onboarding, no seeded web content, no route code-splitting, no dark mode.

---

## PASS 2 — Evaluation by perspective

### A. First-time user / desirability

**The strongest screen by a wide margin is the Today hero**
(`features/today/SuggestedSessionHero.tsx`). Four stacked navy layers on a gradient, inset
highlight, logo watermark at 5.5% opacity, bracket marks, a four-layer 820ms staggered
mount reveal (110ms stagger, `cubic-bezier(0.2, 0.8, 0.2, 1)`), a synchronised hover zoom,
and a reduced-motion path that initialises already-mounted. It is the only part of the app
that looks *designed rather than assembled*. It is genuinely excellent.

**That is also the problem.** It sets an expectation the next 30 seconds do not meet.

A stranger's actual first two minutes:

1. `/login` — good. The three-card fan is charming.
2. Click **"Continue with demo workspace"** →
3. Today paints a charming greeting and then a **14px grey `Loading…`** (`TodayPage.tsx:133`) →
4. …then a **dashed box reading "No decks yet."** The web demo workspace **seeds no
   content at all.** `signInDemo()` mints a session; there is no seeding anywhere in
   `apps/web/src`. Meanwhile `apps/mobile/src/demo/demoCardContent.ts` holds **18 real,
   reviewable cards**.
5. If they click Library, `LibraryBrowserPage` **has no loading state at all** — it
   computes from `data ?? []`, so it flashes **"No decks yet"** on every cold load even for
   a user who has decks.
6. If they click Progress, they get: four zeros, one em dash, a **flat orange sparkline**
   (a `max===min` artifact in `Sparkline.tsx:17`), a delta reading **`"0% vs Jul 1 – Jul 29,
   2026"`**, **30 identical grey heat-map cells**, and **7 "Soon" pills**.

So the desirability question answers itself: a first-time visitor never sees the product.

**Seeding the web demo is deferred by owner decision** and is recorded in `docs/TODO.md`
(P2-1 below). That is a deliberate trade, and it has two consequences worth stating: the
polish work in this plan is aimed at someone who *already has cards*, and a public link
should lead to the marketing site rather than straight into an empty app.

**Once they do have data,** the impression is weakened by roughly **twenty visible
"not built yet" markers**: 7 of 9 Progress sidebar rows, 8 of 11 account-menu rows, and 6
of 7 settings sections. And `/settings` **defaults to `profile`**
(`settingsSections.ts:38`) — the *fully inert* section: a greyed avatar with a camera badge
implying upload, disabled Full name / Username / Bio, **four em-dash statistics**, a
**40%-opacity orange "Save changes" button with white text** (contrast failure,
`ProfileSection.tsx:69-76`), and a complete **red "Danger zone" with a "Delete account"
button for a product that has no account concept.** Clicking "Account settings" in a demo
lands on the deadest screen in the product. **[verify]**

This is not an oversight — it is a documented pattern (`design-system.md` §10). But **you
already overruled it for exactly this situation, on mobile.** D409
(`itera-decisions.md:1506`):

> *"a greyed New Deck said 'this is known, it is not built yet'. In front of a prospective
> user the same control says something else — that the product is unfinished — and eleven
> of them across four screens said it at once."*

Web has twenty across four screens. D409 was never applied to web.

### B. UX / usability

The primary loop is sound for a user who has cards. Review is genuinely well-engineered:
snapshotted queue, transactional commit, real persist-failure retry that re-sends the
identical result, one-level undo. Keep all of it.

The friction is at the entrance and in the details:

- **~10 interactions from first login to first review**, with no onboarding
  (`features.md` confirms: *"No onboarding flow exists"*), and the only non-authoring entry
  is **Import Deck** → the settings JSON importer, requiring a file the user does not have.
- **Recall — the default card type — never shows validation errors.**
  `RecallFields.tsx` does not import or call `validateRecallForm` at all, while the other
  five `*Fields` files render an error list. So `"Prompt is required."` /
  `"Answer is required."` (`recallForm.ts:134-135`) **never appear**. A new author sees a
  greyed Save button with no explanation. `Button.tsx:7` is `disabled:opacity-50` with no
  tooltip and no `aria-describedby`. **This is the single worst authoring defect.**
- **`DeckRow` has no hover state.** `DeckRow.tsx:64-68` — `role="button"`,
  `cursor-pointer`, a focus ring, and **no `hover:` rule**. Same for `CardTableRow`,
  `ContinueLearningList` rows, `OrderingRow`, and `DeckPerformanceTable` rows (which are
  `<Link>`s). The most-clicked rows in the app give no pointer feedback.
- **The keyboard tip is wrong for 5 of 6 card types.** `CardListFooter.tsx:137` says
  *"Press Space to reveal answer during review"* — only Recall responds to Space; the other
  five need Enter (`ReviewSessionScreen.tsx:212-221`).
- **`Sign out` renders greyed with a "Soon" pill when not authenticated**
  (`AccountMenuContent.tsx:177`) — semantically wrong.
- **8 dead, focusable rows** stand between a keyboard user and Sign out.
- **No mobile navigation.** `TopNav.tsx:30` is `flex h-16 max-w-[1280px] overflow-x-auto`,
  not sticky; at 390px it becomes a horizontal scroller with no affordance and the streak
  badge and account menu scroll off-screen. **[verify]**
- **Library tables force horizontal scroll** (`min-w-[720px]` / `min-w-[800px]`;
  Review history `min-w-[720px]` on a shell that already collapses at 880px).
- **`sendMagicLink` can hang forever** on "Sending…" and renders raw transport errors
  (`TODO.md` §"Magic-link send", open).
- **No PWA install prompt, update toast, or offline indicator** despite
  `registerType: 'autoUpdate'` and a full 24-entry precache. You ship an installable
  offline app and never say so.
- **`CardListFooter` renders every page number** with no truncation — 40 pages, 40 buttons.

### C. Visual design

**Do not change the palette.** I looked for a reason and there isn't one. Navy + orange +
a slate ramp is correct for this audience, the orange-as-signal rule is right, and drift is
mechanically prevented (`tokenDrift.test.ts` asserts CSS↔TS agreement both ways).

There *are* three contrast defects, and they are contrast, not palette:

| Color | Usage | On white | AA |
|---|---|---|---|
| `--itera-muted-light` `#94a3b8` | instructional copy — `OrderingView.tsx:101` ("Drag items into the correct sequence."), `ProgressNav.tsx:95`, ~32 usages | **2.56:1** | ✗ badly |
| `--itera-accent` `#ff6902` | orange **text** in ~39 places incl. the deck Due count (`DeckRow.tsx:96`) and `Stat.tsx:25` at 18px bold | **2.89:1** | ✗ |
| `--itera-muted` `#64748b` | all secondary text | 4.76:1 on white but **4.44:1 on the canvas `#f6f7f9`** | ✗ marginal |

Plus `ProfileSection.tsx:69` — `bg-itera-accent/40` with `text-white`.

**And then the drift.** This is the finding that explains the feeling:

- **Primary buttons — 7 paddings, 4 hover strategies.** `Button` primary is
  `hover:brightness-110` (**lightens**); Library's New Deck is `hover:brightness-95`
  (**darkens**); MC Submit is `hover:bg-itera-accent-hover`; the hero is a literal
  `hover:bg-[#F66200]` — which is **not** the `--itera-accent-hover` token `#ea5f00`.
  Paddings: `px-4 py-2`, `px-7 h-[52px]`, `h-11 px-5`, `px-6 py-3`, `px-8 py-3`,
  `px-5 py-2.5`, `px-4 py-2.5`, `px-3.5 py-2`.
- **`Button.tsx` has no `transition` at all** — the base primitive snaps on hover, while
  ad-hoc buttons around it use `transition-colors`, `transition-[filter]`, or
  `transition-all duration-150 ease-out`.
- **`transition-opacity hover:brightness-105` appears 8 times** — the transitioned property
  (`opacity`) is not the animated one (`filter`), so **every one of those hovers snaps
  anyway.** The same intent is written correctly once, as `transition-[filter]`.
- **Six one-off radii** beside the four tokens (9/14/16/999): `rounded-[21px]` (hero),
  `rounded-[18px]` (login card), `rounded-[8px]` (ReviewTopBar nav), `rounded-[7px]`
  (density toggle, editor tabs), `rounded-[6px]` (kbd), `rounded-[3px]` (flip cue), plus
  bare `rounded`.
- **The global focus ring is `border-radius: 6px`** (`index.css:299-303`) — matching **none**
  of the four tokens, so it is subtly the wrong shape on every control it wraps. And
  `SignInPanel` is the only surface that authors its own focus styles; `ReviewTopBar` uses
  `outline-*` where everything else uses `ring-*`; `ring-offset-2` is applied
  inconsistently; and `CollectionNav`, `CardListFooter`, `RowFilterDropdown`, `FilterMenu`,
  `OverflowMenu` and `CardTableRow` have **no focus treatment at all**.
- **Five page `<h1>` treatments.** Today `text-3xl font-bold tracking-tight` (no display
  face) · Library `font-itera-display text-3xl font-bold tracking-tight` · Progress
  `font-itera-display text-3xl font-bold` (no tracking) · Settings
  `font-itera-display text-3xl font-extrabold tracking-tight` · New card
  `text-2xl font-semibold`. And `--font-itera-display` resolves to Inter
  (`index.css:108`) — **it is a no-op class, applied inconsistently.**
- **Four metric type scales**: `text-[30px] font-medium` (KpiTile) · `text-2xl
  font-semibold` (Momentum streak) · `text-xl font-bold` (Profile stats) · `text-base
  font-bold` (StreakBadge) · `text-sm font-bold` (Momentum retention/due — in the *same
  panel* as the `text-2xl` one).
- **Three card shadow depths.** Progress cards and Today panels take
  `--itera-shadow-card`; `KpiTile` dark, Settings `Panel`, `RouteError`, `EmptyState` and
  Deck Insights cards take **none**; and two surfaces invent literals
  (`shadow-[0_2px_10px_...]`, `shadow-[0_1px_3px_...]`). Meanwhile
  `SegmentedToggle` puts the **full card shadow** (`0 12px 30px`) on a 26px pill.
- **Raw Tailwind palette inside a tokenized system**: `bg-blue-500`, `bg-amber-500`,
  `bg-blue-600`, `bg-emerald-600`, `bg-violet-600`, `bg-teal-600`, `bg-slate-500/45`,
  `shadow-lg`, `bg-black/30` — plus hardcoded hex `#ffb37a` (heatmap), `#c3ccd9` (login),
  and four hero colors.
- **Three scrim colors**: `rgba(23,32,51,0.45)` (dialogs), `rgba(23,32,51,0.35)` (account
  sheet), `bg-black/30` (Library drawer).
- **`Button.tsx` and `Field.tsx` — the two most-used primitives — are still on legacy
  tokens** (`bg-accent`, `border-border`, `bg-code-bg`, `text-text`) while 60+ feature
  components use `itera-*`.
- **`EmptyState` is the least designed component in the app.** Its own comment says
  *"Generic **icon-free** empty-state block."* A dashed box with a **14px** semibold title
  — smaller than the body copy of the panels it replaces — reused for seven states
  including a new user's Today.
- **Five different empty-state treatments** overall: the dashed block with CTA; the dashed
  block without; a bare `<p className="mt-4 …">`; a bare `<p className="mt-8 …">`; and one
  that is **unreachable dead code** (`ActivityHeatmap.tsx:52` — `computeHeatmap` always
  returns exactly `days` cells, so `"No review activity yet."` never renders).
- **Scrollbars are unstyled app-wide.** Zero `::-webkit-scrollbar` / `scrollbar-width` /
  `scrollbar-color`, on a product whose core surfaces are a paginated table and a scrolling
  sidebar.

### D. Motion and interaction

Measured across `apps/web/src` (140 non-test `.tsx` files):

| Metric | Count |
|---|---|
| Files with any transition/animation class | 32 / 140 (23%) |
| Files with `hover:` but **no** transition | **22** |
| `transition-colors` | 34 |
| `transition-opacity` | 9 (**8 of them animating the wrong property**) |
| `duration-*` utilities in the whole app | **1** |
| `animate-*` utilities in the whole app | **0** |
| `@keyframes` in the whole app | **1** (`reveal-in`) |
| Skeleton / shimmer / spinner styles | **0** |
| Animation libraries | **0** |
| `transition-*` in `features/progress`, `features/settings`, `components/ui`, `RouteError` | **0** |

**~80% of all motion in Itera is a hover color fade**, and Progress, Settings and every UI
primitive have none at all. The app feels like two products: an animated Today and a static
everything-else.

Three places have real, designed motion, and all three are good: the hero's stack reveal,
`.itera-flip` (Recall flip), `.itera-card-enter` (next-card settle). **Keep all three.**

What is missing is specific:

1. **The answer reveal has no motion.** The most repeated moment in the product — dozens of
   times per session — snaps. Only Recall flips; the other five reveal their feedback
   banner, `ExplanationPanel` and `RatingControls` instantly. And `.reveal-in`
   (`index.css:311-323`, 250ms, reduced-motion-aware) already exists and is used in
   **exactly one place**: the card-create type switch. *The animation named for the reveal
   is not used for the reveal.*
2. **The completion screen has no motion**, though `design-system.md:322` explicitly lists
   *"a calm completion transition"* (350–600ms) in the locked motion language.
3. **Dialogs, popovers, the account bottom sheet and the Library drawer all appear
   instantly** — the drawer's own comment calls it a "slide-in drawer" and it has no
   transform. `FloatingPanel` is `visibility: hidden` for one frame on mount, a visible pop.
4. **No session progress bar in Review** — only `"1 of 12"` text, on a product whose
   sibling pages are covered in rings and meters. The Matching connectors, Walkthrough step
   pips and `MasteryRing` stroke all snap.

Two rule violations to know before touching motion:

- The flip easing `cubic-bezier(0.34, 1.32, 0.5, 1)` overshoots — `design-system.md:322`
  forbids *"bounce-heavy easing."*
- Durations exceed the locked table (`design-system.md:325-334`): flip **550ms** vs
  320–420ms; card-to-card **500ms** vs 180–280ms.

And documentation drift: **`.card-editor-shell` is a dead class.** Applied at
`CardEditorShell.tsx:60`; `design-system.md:339` and D85 both describe it as animating
`max-width` with a reduced-motion override. **No such rule exists in `index.css`.**
Likewise **`itera-card-prompt`** (`CardPrompt.tsx:23`) is defined nowhere.

### E. Emotional design / personality

**This is the most surprising finding in the audit, and it inverts the usual advice.**

`packages/core/src/today/greetings.ts` contains **55 hand-written lines** across four
time-of-day buckets, and they are genuinely good and precisely on-target:

> *"Morning. Let's see what survived the night."*
> *"One session. No dramatic montage required."*
> *"Still compiling?" / "Maybe one more concept will finish the build."*
> *"The sun is offline. Itera is not."*
> *"Everyone else logged off. Nerd."*

That is exactly your target voice: professional, intelligent, warm, slightly playful.
**It appears in exactly one place** — the Today `<h1>`, for two seconds before the session
starts. Then the product goes silent:

- **Zero exclamation marks** in user-facing copy, anywhere.
- **Zero praise vocabulary.** A regex for `great|nice|well done|congrat|good job|awesome`
  across all 140 components returns one hit, in a comment.
- **Exactly one emoji, and it is an orphan**: `ReviewPage.tsx:68` renders
  **`Nothing due 🎯`**. Nothing else in the product has an emoji.
- **The only affective word in the product is negative** — a flat `Incorrect`
  (`MultipleChoiceView.tsx:185`, `WriteCodeView`, `StepResponse`).
- **Five near-identical phrasings of nothingness** with no governing rule: `All caught up`
  (×2), `Nothing due`, `Nothing waiting`, `Nothing to show yet`, `No cards yet`,
  `No decks yet`, `All done`.
- **Three placeholder vocabularies**: `Soon` (two different pill styles), `Coming soon`
  (dead code — all six types are enabled), and `Not available yet.` — which opens **five
  consecutive settings sections** verbatim.
- **Punctuation is not governed**: `Loading…` / `Saving…` (U+2026) vs `Search decks...`
  (three periods); em dash `—` in some strings and ASCII `-` used as an em dash in the
  review-failure copy and the collection note; curly `“…”` in delete confirms vs straight
  `"…"` in search results.
- **Implementation language leaks to learners**: `Tip (optional)` as a card panel title,
  `(legacy compatibility)` in a Library note, `Tap a term, then tap the value…` on desktop
  web, and `<` used as a back chevron in `ReviewTopBar`.
- **Login has a copy conflict**: *"Private by default / No accounts required. Ever."* sits
  directly opposite a form asking for an email address.

**Root cause:** `docs/design-system.md` has fifteen sections — tokens, typography,
surfaces, icons, markdown, code, shape, navigation, menus, motion, accessibility,
responsive, references, marketing — and **no section on voice or copy**. The tone is not
*chosen*; it is *unowned*. `greetings.ts` is what happened when someone wrote copy with
care; the stray 🎯 is what happens when no authority exists to remove it.

So the prescription is not "add personality." **You already wrote the voice. Distribute it,
and write it down.**

### F. Motivation / motivational design

**The distinction that governs this section, stated by the product owner:**

> *Don't add a gamification subsystem. Make the existing learning loop more rewarding.*

Those are two different things and the audit treats them as such. A **subsystem** — XP,
currency, levels, leaderboards, arbitrary achievements — invents a second scoring model
that competes with FSRS, needs entities and settings behind it, and is the thing to refuse
before validation. **Motivational design** — streak feedback, mastery moments, session
summaries, progress celebration, daily-consistency signals, a satisfying end to a review —
is light gamification, it is in scope, and Itera currently has almost none of it.

**The raw material already exists and is honest.** A canonical streak (one definition,
shared by nav/Today/Progress), real retention, a real heat map, a derived Next milestone,
real per-deck mastery. Nothing new has to be computed to make the loop feel rewarding.

**What was refused and should stay refused:** **Weekly Goal** (D209 — removed rather than
fabricated) and **milestones/achievements as persisted entities** (D210). Both were right.
Note what those decisions actually refused: *fabricating a metric with no definition behind
it.* Neither refused celebrating a number that is already true.

**The gap is that every real mechanic is unmarked.** The streak increments silently.
`StreakBadge` shows `0 / day streak` permanently to every new user and never pluralises
(it will read `1 day streak`). A deck reaching full mastery produces nothing. The heat map
gains a cell with no acknowledgement. Finishing a session — the emotional payoff of the
whole product — says *"Reviewed 12 cards."* in a mispositioned white box.

So the prescription is not "add gamification" and not "don't gamify." It is: **build the
reward layer over the mechanics you already have, and build no new scoring model
underneath it.** Concretely, four moments are worth designing, in this order:

1. **Session completion** (P1-1) — the highest-value moment in the product, and currently
   the flattest. A real summary plus a calm transition.
2. **The streak increment** — mark it where it happens, at completion, rather than letting
   a nav badge silently tick over.
3. **Deck mastery** — a deck crossing 100% learned is a genuine milestone the product
   already computes and never mentions.
4. **Returning after a gap** — the first review after a break is the moment retention is
   won or lost, and the product says nothing.

Each is in-place feedback on a true number. None needs an entity, a settings surface, or a
second currency. `design-system.md:322` still governs the *form*: quiet momentum, no
confetti, no spectacle — restraint is what keeps this reading as intelligent rather than
childish, which is the whole target.

### G. Demo / marketing perception

**Show, in order:** (1) the six interaction types — Matching's drawn connectors with
badges at midpoints, Ordering's keyboard drag, Write Code in real CodeMirror. This is your
entire differentiation and it is fully built. (2) The Today hero's mount-in reveal as an
opening shot. (3) Progress's navy KPI tile, heat map and retention chart. (4) The rating
controls showing the real FSRS next interval on each button.

**Avoid showing:** `/settings` (6 of 7 dead, defaults to the deadest), the Progress sidebar
(7 of 9 "Soon"), the account menu (8 of 11 "Soon"), `/roadmaps` (pre-redesign), any empty
state, and the completion screen in its current form.

**The marketing site is where your polish currently lives — and it is fake.**
`apps/marketing/src/App.tsx` is a considered editorial composition: alternating navy/white
sections, a 430px `{ }` glyph watermark, a blurred orange blob, a 3D-rotated code window
with a 7s ambient float, desktop and phone device frames, `clamp(50px, 5.3vw, 78px)`
display type, variable-font micro-weights (450/560/620/650/680), a `3px` orange focus ring,
`scroll-behavior: smooth`, and a **blanket** reduced-motion override the app lacks. It is
better-composed than the app it advertises.

Its product section is a **hand-drawn HTML mockup** carrying
`data-future-media-slot="20–40 second product recording"` and a literal **"Demo slot"**
button. Your highest-leverage marketing asset is the recording that goes in that slot —
which is exactly why the app must survive close-up video.

**Two non-visual findings outrank everything else in this audit:**

1. **The early-access form discards every submission.** `earlyAccess.ts:15` —
   `submitEarlyAccessInterest` is `Promise.reject(...)`, unconditionally. The UI honestly
   says *"Preview form: submissions are not stored yet"* and on submit shows *"Email
   capture is not connected yet. Your details have not been sent or stored."* **A Reddit
   post against this page converts 0% of interested developers.** This is a genuine
   blocker the moment the page is linked publicly → **P0-1**, and `docs/TODO.md`.
2. **The web demo workspace is empty** (§A) — the same class of problem, **deferred by
   owner decision** → **P2-1**, and `docs/TODO.md`. The consequence to plan around: a
   public link should land on the marketing site, not on `/login`'s demo button.

Minor but free: `apps/web/index.html` has **no `<meta name="description">`, no OG/Twitter
tags, no `theme-color`**, and uses a **164 KB PNG** favicon while an unused
`public/favicon.svg` sits beside it (the same PNG is also loaded and scaled to 40×40 in the
nav). `app/router.tsx` eagerly imports all 20 pages — 1,074 kB main chunk, 306 kB gzip.

---

## PASS 3 — The diagnosis

### Why it feels "one level below"

**1. There is a craft gradient inside one product.** Four surfaces were built to a high
standard (the Today hero, the Login illustration, Progress's tiles and charts, the Review
rating controls). Everything connecting them was built to *correct and honest* rather than
*finished*. Users can't name this; they feel it as inconsistency and read it as "prototype
with a few good screens." Your eye is comparing the connective tissue against the hero,
which is why the feeling is real and unnameable at once.

**2. The design system is documented but not enforced in code.** Color tokens are
mechanically protected by a drift test — and nothing else is. There is no shared Button
everyone uses (there is a `Button`, and half the app ignores it), no heading component, no
card component, no empty-state standard, no loading standard. So each screen re-derives
them: 7 button paddings, 4 hover strategies, 6 stray radii, 5 `<h1>` styles, 4 metric
scales, 3 shadow depths, 3 scrim colors, 5 empty-state treatments. **This, more than any
single screen, is what separates "looks good" from "feels like one product."**

**3. The product is honest about being unfinished in ~20 visible places.** Each is
individually defensible; collectively they dominate. You already diagnosed and fixed this
on mobile (D409); web never got the pass.

**4. The voice exists but is not distributed.** 55 charming lines in one `<h1>`; the rest
of the product — including the payoff of the core loop — in flat system-report English,
with one stray emoji and one negative word as the only affect present.

**Underneath all four:** the product's most repeated moments have no motion and no payoff.
The answer reveal snaps. Every navigation is a bare grey `Loading…`. The session ends in a
white box saying *"All done / Reviewed 12 cards."* Individually trivial; cumulatively, the
product feels like it does not respond to you.

---

### 1. Already strong — leave it alone

- **The palette and token architecture.** Correct, drift-tested, and changing it would cost
  weeks for nothing.
- **The IA.** Three destinations, scoped search, scoped create, settings in the account
  menu, Review immersive by construction.
- **`SuggestedSessionHero`.** Owner-locked by D413. Do not touch offsets, rotations,
  colors or the stagger.
- **The six interaction Views.** Fully built, shared behavior, security-regressed. This is
  the differentiation.
- **`RatingControls`.** 116px cards, real FSRS intervals, an overridable suggestion, and a
  documented refusal to *"assign an emotion to the learner."*
- **The Login composition.** The three-card fan, the Inter/650 wordmark, the principles row.
- **Progress's substance.** Five honest KPIs, DST-safe calendar arithmetic, gap-aware
  retention, actionable deck ordering.
- **The Review engineering.** Snapshotted queue, transactional commit, persist-failure
  retry with identical-result resend, one-level undo.
- **`greetings.ts`.** Do not trim it. Extend the same voice elsewhere.
- **The honesty doctrine** (D209, D210, D414, D415). Keep refusing to fabricate data.

### 2. Minor finishing issues

Grouped; full detail is in the backlog.

- **Outright defects:** the completion screen's missing vertical centering; the permanently
  highlighted `All Decks` nav row; `Sign out` rendering as a "Soon" pill; the 8 broken
  `transition-opacity hover:brightness-105` pairs; the unreachable heat-map empty state;
  the dead `Coming soon` branch; two dead CSS classes; the keyboard tip that is wrong for
  5 of 6 card types; `MeterBar`'s unnamed `progressbar`; `StreakBadge`'s missing plural and
  missing accessible name below `sm`; malformed CSS comment openers at `index.css:242,325`.
- **Drift:** 7 button paddings, 4 hover strategies, 6 stray radii, 5 `<h1>` styles, 4 metric
  scales, 3 shadows, 3 scrims, 3 `<kbd>` recipes, 3 placeholder vocabularies, 2 "Soon" pill
  styles, raw Tailwind palette in 9 places, legacy tokens in both UI primitives.
- **Contrast:** three failures (§C) plus the 40%-opacity Save button.
- **Copy hygiene:** ellipses, dashes and quotes ungoverned; `Tip (optional)`;
  `(legacy compatibility)`; `Tap` on desktop; `<` as a chevron; login's privacy/email
  conflict; the missing third check badge on Login's principles.
- **Metadata:** no description/OG/theme-color; 164 KB PNG favicon; unused SVG.
- **Decorative dead affordances:** three `Info` icons with no tooltip in Progress; an
  unwired `<Star>` on the deck page; a camera badge on an inert avatar.

### 3. High-leverage polish opportunities

Apply D409 to web · a loading standard · a real `EmptyState` · rebuild the completion screen
into a session summary · mark the streak, mastery and return moments · animate the reveal
with the class you already have · consolidate `Button` · fix the three contrast failures.
All detailed in PASS 4. (Seeding the demo workspace would belong here too; it is deferred
by owner decision to P2-1 and `docs/TODO.md`.)

### 4. UX problems

No onboarding · the empty web demo (deferred, P2-1) · Recall's invisible validation ·
no row hover · the
wrong keyboard tip · Library's missing loading state (flashes "No decks yet") ·
`LibraryDeckPage` rendering `null` (a blank page) while loading · Progress having no empty
state at all · `/settings` defaulting to an inert section · no mobile nav · horizontal
scroll below 800px · `sendMagicLink` hanging · no PWA affordance · JSON-only import.

### 5. Missing delight, personality and reward

The completion screen · the un-animated reveal · **every motivational mechanic unmarked**
(the silent streak, unacknowledged deck mastery, an unremarked return after a gap) ·
undesigned empty states · bare `Loading…` · the voice trapped in one file · `Incorrect` as
the only affective word · no voice section in the design system.

Note that this bucket and P1-10 are the same bucket. Itera's loop is *correct* and not yet
*rewarding*, and closing that needs no new subsystem — only feedback on numbers the product
already computes.

### 6. Larger optional ideas (post-validation)

Deck identity beyond a derived monogram (`TODO.md` §"Deck identity") · a commissioned icon set
(`TODO.md` §"Icons" — see the caution in PASS 5) · a shareable session card
(`TODO.md` §"Shareable results") · route code-splitting · mobile web navigation · dark mode · a real
milestone entity, only if validation asks for it.

---

## PASS 4 — Ranked backlog

Each item: **problem · where · why · change · impact · scope · category.**

### P0 — Fix before showing Itera publicly

**P0-1 · The early-access form discards every submission**
`apps/marketing/src/earlyAccess.ts:15`; UI at `App.tsx:107,118`. This is the single
measurable output of validation — a perfect post still yields zero leads, and an interested
developer sees an error. **Change:** connect one provider behind the existing seam (the
file is designed as *"the only persistence boundary"*) — Supabase table, Formspree, a
Google Form, anything — then remove the "not stored yet" line and add a real success state.
D452 refused a *mocked* success; a real one is now correct. **Impact:** turns traffic into
data; nothing else matters if this stays broken. **Scope:** tiny. **Conversion.**
**Also recorded in `docs/TODO.md`.** This is a P0 *only if the marketing page is linked
publicly* — if the page stays unlinked, it drops to P1 and nothing else in this plan
changes.

**P0-2 · Twenty visible "not built yet" markers**
`ProgressNav.tsx:93-103` (7 of 9) · `AccountMenuContent.tsx:83` (8 of 11) ·
`settingsSections.ts:29-35` (6 of 7 inert) · `ProfileSection.tsx` (fully mocked, **and it
is the default landing** via `DEFAULT_SECTION = 'profile'`, line 38, complete with a red
Danger Zone and a "Delete account" button for a product with no accounts). Precisely the
situation D409 named on mobile. **Change:** apply D409's rule to web. Remove the unbuilt
Progress rows, the unbuilt account-menu rows and the six inert settings sections; point
`DEFAULT_SECTION` at `'import-export'`. Keep the *code* — this is visibility, not deletion
— and append a dated decision entry scoping it to the validation build and
cross-referencing D409. **Impact:** very high per unit of effort; removes the dominant
"prototype" signal from four screens at once. **Scope:** small.
**Desirability + visual polish.**

**P0-3 · Loading is a bare `Loading…` — or absent, or a blank page**
Ten occurrences of the literal string (`TodayPage.tsx:133`, `ProgressPage.tsx:111`,
`ReviewHistoryPage.tsx:120`, `ReviewPage.tsx:59`, `PreviewPage.tsx:107`,
`CardEditEntry.tsx:27`, `CardStudyPreviewPage.tsx:22`, `AuthGate.tsx:17`, plus Roadmaps),
zero skeleton styles — **and two worse cases**: `LibraryBrowserPage` has no loading branch
at all and flashes **"No decks yet"** on every cold load, and `LibraryDeckPage.tsx:295`
returns `null`, i.e. a blank white page. Also, `ProgressPage`'s `Loading…` renders *outside*
`ProgressShell`, so the sidebar vanishes and the page reflows when data lands, while
`ReviewHistoryPage` wraps its own. **Change:** add one skeleton primitive (a token-colored
block with a subtle shimmer keyframe and its own `prefers-reduced-motion` rule per
`design-system.md:339`) and one convention: *the page frame always renders; only the data
regions skeleton.* Apply to Today's grid, Progress's tiles and charts, the Library table,
the deck page and Review's start screen. Keep the blocking semantics as they are — only
what is painted during the block changes. **Impact:** high; this fires on every navigation
a viewer sees and is the most-repeated prototype tell. **Scope:** small–medium.
**Visual polish + UX.**

**P0-4 · The completion screen is mispositioned**
`ReviewSessionV2.tsx:76` calls `<IteraSurface>` with **no `className`**, while the loading
branch uses `grid min-h-screen place-items-center`, the empty branch adds `px-4`, and the
live session uses `min-h-screen`. The completion card therefore sits **flush against the
top of the viewport on a canvas that does not fill the screen** — the last thing a learner
sees every session, and the shot a demo video ends on. **Change:** one className.
**Impact:** high relative to effort. **Scope:** tiny. **Visual polish.** **[verify]**

---

### P1 — High-value polish before / between early demos

**P1-1 · The completion screen is the biggest missed moment in the product**
`ReviewSessionV2.tsx:74-108` — `All done` / `Reviewed {n} cards.` / two buttons. One stat.
No accuracy, no time, no streak, no per-rating breakdown, no next-due, no motion. Per
D415's own phrasing this is *"the most-recorded surface in the app."* Every number it needs
is already in scope (`queue`, `undoStack`, the logs). **Change:** rebuild as a real session
summary using only true data: cards reviewed, an Again/Hard/Good/Easy breakdown or
accuracy, time taken, **the streak with its increment marked**, next due. Add the *"calm
completion transition"* `design-system.md:322` already specifies (350–600ms, no confetti);
the layered-card motif is explicitly sanctioned for *"completion or branded transition
moments"* (`design-system.md:228`). Write the copy in `greetings.ts`'s voice, varied by
outcome. Keep `Undo last` and `Back to Today`. **Impact:** very high — the change most
likely to make someone say "I want to use that." **Scope:** medium.
**Delight + desirability + demo.**

**P1-2 · The answer reveal has no motion, and `.reveal-in` is sitting unused**
`ReviewSessionScreen.tsx:299-327`. The most repeated moment in the product snaps for five
of six types, while `.reveal-in` (`index.css:311-323`, 250ms, reduced-motion-aware) is used
only in `CardCreatePage.tsx:119`. **Change:** apply it to the feedback banner, explanation
panel and rating controls on reveal, with a small stagger. Nothing new is needed. **Do
not** attempt a two-card crossfade — D100 considered and rejected it. **Impact:** high,
disproportionate to effort. **Scope:** tiny. **Delight + visual polish.**

**P1-3 · Recall — the default card type — shows no validation**
`RecallFields.tsx` never imports or calls `validateRecallForm`, while the other five
`*Fields` render an error list. `"Prompt is required."` / `"Answer is required."`
(`recallForm.ts:134-135`) are unreachable, so a new author faces a greyed Save with no
explanation (`Button.tsx:7` is `disabled:opacity-50`, no tooltip, no `aria-describedby`).
**Change:** render the error list in `RecallFields` like the other five; make all six
`role="status"`/`aria-live`; and give the disabled Save an `aria-describedby` pointing at
the reason. **Impact:** high — this is the first thing an evaluating developer does after
seeing the demo content. **Scope:** small. **UX.**

**P1-4 · Consolidate the primitives (the drift fix)**
`Button.tsx`, `Field.tsx`, and the ~40 ad-hoc buttons that ignore them. Seven primary
paddings, four hover strategies (two in opposite brightness directions), six stray radii,
five `<h1>` styles. **Change, in one pass:** (a) give `Button` a `transition-colors`, move
it to `itera-*` tokens, `rounded-itera-control`, and **one** hover rule
(`hover:bg-itera-accent-hover`); (b) replace the ad-hoc primaries with it, allowing a
documented `size` prop instead of eight paddings; (c) fix the 8 broken
`transition-opacity hover:brightness-105` pairs; (d) delete the six one-off radii in favour
of tokens; (e) pick **one** `<h1>` recipe and apply it everywhere (note
`font-itera-display` is a no-op — either give it a real role or remove it); (f) change the
focus ring's `border-radius: 6px` to `9px`. Consider a small `tokenDrift`-style test that
fails on a raw `bg-blue-*`/`bg-emerald-*`/`shadow-lg`/hex literal in feature code, so this
cannot re-accumulate. **Impact:** this is the item that most directly answers "why does it
feel one level below," even though no screenshot shows it. **Scope:** medium.
**Visual polish + maintainability.**

**P1-5 · `EmptyState` is one component reused seven times, and it is undesigned**
`features/library/shared/EmptyState.tsx` — dashed box, **14px** title (smaller than
surrounding body copy), explicitly icon-free. Plus four *other* empty-state treatments
across Progress, one of them unreachable dead code (`ActivityHeatmap.tsx:52`), and Progress
having no page-level empty state at all. **Change:** give `EmptyState` a real design — an
optional icon slot, an 18–22px heading, 14–15px body, generous rhythm, a solid surface
rather than a dashed rectangle — then route Progress's four bare `<p>` empty states through
it, delete the unreachable branch, and add a Progress page-level zero-data state so a new
user does not meet four zeros, a flat sparkline and a comparison against a date range with
no data. **Impact:** high; one file upgrades seven screens plus the worst zero-data page.
**Scope:** small–medium. **Visual polish + UX.**

**P1-6 · Three contrast failures, one on a semantic value**
`--itera-accent` as text (≈2.89:1) in ~39 places incl. `DeckRow.tsx:96` and `Stat.tsx:25`;
`--itera-muted-light` (≈2.56:1) as instructional copy in ~32 places; `--itera-muted` at
4.44:1 on the canvas; plus `ProfileSection.tsx:69`'s `bg-itera-accent/40` + white.
**Change:** **do not change the brand orange.** Add one darker `--itera-accent-text`
(~`#c2510a`, ≈4.6:1 on white) for orange used as *text*, keeping `#ff6902` for fills,
borders, icons and the active marker. Darken `--itera-muted` slightly. Stop using
`--itera-muted-light` for instructional copy — reserve it for placeholders and decorative
marks. `tokenDrift.test.ts` requires the matching entry in `packages/core/src/design/tokens.ts`
in the same pass. **Impact:** medium visually, high for perceived quality — thin
low-contrast text is a reliable "template UI" tell. **Scope:** small.
**Visual polish + accessibility.**

**P1-7 · Rows that are clickable and give no feedback**
`DeckRow.tsx:64-68` (the primary Library action), `CardTable` rows,
`ContinueLearningList` rows, `OrderingRow`, `DeckPerformanceTable` rows. Plus 22 components
that change on `hover:` with no transition. **Change:** add
`hover:bg-itera-surface-subtle transition-colors` to the clickable rows, and sweep
`transition-colors` onto the 22 snapping files. **Impact:** medium, felt on every Library
interaction. **Scope:** tiny. **UX + visual polish.**

**P1-8 · The voice exists in one file and is unowned everywhere else**
`greetings.ts` vs. the rest; the orphan `🎯` (`ReviewPage.tsx:68`); five "nothing here"
phrasings; three placeholder vocabularies; ungoverned ellipses/dashes/quotes; `Incorrect`
as the only affect; `Tip (optional)`, `(legacy compatibility)`, `Tap` on desktop; Login's
*"No accounts required. Ever."* opposite an email field. **Change:** (a) add a **§Voice and
tone** section to `design-system.md` — the target, plus rules for placeholders, ellipses,
dashes, quotes and emoji — so the tone becomes owned; (b) rewrite the terminal and empty
states in that voice with one consistent pattern; (c) remove the orphan emoji, soften
`Incorrect` to something describing the answer rather than judging the learner (`Not quite`
/ `Missed one`), consistent with `RatingControls`'s own documented refusal to assign
emotion; (d) fix the leaked implementation language and the Login conflict. **Impact:**
high for memorability, near-zero risk, no new systems. **Scope:** small.
**Delight + desirability.**

**P1-9 · Fix the visible defects**
The permanently highlighted `All Decks` row (`CollectionNav.tsx:103` never reads
`selection.kind === 'all'`); `Sign out` rendering as a "Soon" pill when signed out
(`AccountMenuContent.tsx:177`); the keyboard tip that is wrong for 5 of 6 types
(`CardListFooter.tsx:137`); `MeterBar`'s `role="progressbar"` with no accessible name;
`StreakBadge` reading `1 day streak` and having no accessible name below `sm`; the dead
`Coming soon` branch (`CardTypeChooser.tsx:56`); the two dead classes
(`itera-card-prompt`, `.card-editor-shell` — restore or remove, and correct
`design-system.md:339` and D85); the unwired `<Star>` (`LibraryDeckPage.tsx:379`); the three
tooltip-less `Info` icons; `CardListFooter` rendering every page number; the malformed CSS
comment openers. **Impact:** individually small, collectively the difference between
"finished" and "nearly." **Scope:** small. **Multiple.**

**P1-10 · Motivational design: mark the moments the product already computes**
Every real mechanic in Itera is unmarked. The streak increments silently. `StreakBadge`
shows `0 / day streak` to every new user and never pluralises. A deck crossing full mastery
produces nothing. The heat map gains a cell in silence. Returning after a gap — the moment
retention is actually won or lost — is unacknowledged.

**Change:** a reward layer over existing mechanics, with **no new scoring model
underneath** (D209/D210 stand — no goal entity, no achievement entity, no XP, no currency).
Four moments, in this order:

1. **Session completion** — the summary in P1-1. This is the anchor; the other three are
   cheap once it exists.
2. **The streak increment**, marked at completion where it is earned rather than silently
   in a nav badge. Fix the pluralisation and the permanent `0` while you are there (P1-9).
3. **Deck mastery** — a deck crossing 100% learned, surfaced on the deck page and in the
   completion summary when a session causes it.
4. **Return after a gap** — the first review after a break, acknowledged rather than
   treated as an ordinary session.

Each is in-place feedback on a number that is already true, so nothing is fabricated. The
*form* stays governed by `design-system.md:322`: quiet momentum, no confetti, no spectacle.
Restraint is what keeps this reading as intelligent rather than childish — which is the
whole target, and the reason this is motivational design rather than a gamification
subsystem.

**Impact:** high for retention and for the "I want to use that" reaction; this is the
substance behind `TODO.md` §"Gamify". **Scope:** small–medium once P1-1 exists.
**Delight + motivation + desirability.**

**P1-11 · Metadata and first-load weight**
`apps/web/index.html` (no description/OG/theme-color; 164 KB PNG favicon; unused
`favicon.svg`; the same PNG at 40×40 in the nav); `app/router.tsx` (20 eager imports,
306 kB gzip). A shared app link produces a naked preview, and a cold visit downloads
306 kB before anything paints — directly in front of P0-3's `Loading…`. **Change:** add the
metadata, point the favicon at the SVG, use the SVG in the nav, and lazy-route the heavy
non-entry pages (Roadmaps, Settings, Review history, design-preview) via the existing
`lazyWithRetry`/`importWithReload`. **Scope:** small. **Conversion + perceived performance.**

**P1-12 · Magic-link sign-in can hang forever**
`SignInPanel.tsx`'s `sendMagicLink` (`TODO.md` §"Magic-link send"). A throw leaves the button
permanently reading "Sending…" with no recovery but a reload, and errors render raw GoTrue
strings. **Change:** wrap the call, treat thrown and returned errors identically, end in a
decided state on every path, show a written sentence — the standard D263 already applied to
the bootstrap path. **Scope:** tiny. **UX.**

---

### P2 — After initial validation

- **P2-1 · Seed the web demo workspace.** **Deferred by owner decision; recorded in
  `docs/TODO.md`.** `signInDemo()` (`packages/core/src/auth/authEngine.ts:139`) mints a
  session only; no seeding exists in `apps/web/src`, while
  `apps/mobile/src/demo/demoCardContent.ts` holds 18 real cards. "Continue with demo
  workspace" therefore lands on a dashed "No decks yet" box, and the six interaction types
  are invisible unless the visitor authors a card first. Closing it means seeding on
  `signInDemo()` from the mobile content — 2–3 decks, ~18 cards covering all six types, and
  backdated ReviewLogs so Today, the streak, the heat map and retention have something true
  to show — clearly labelled as a demo workspace and disposable in the local backend.
  *Medium · desirability + UX + demo.*
- **P2-2 · Scrollbar styling.** Unstyled OS scrollbars on the deck table and Library
  sidebar. *Tiny · visual polish.*
- **P2-3 · Motion-rule cleanup.** Flip to 320–420ms, card-to-card to 180–280ms, replace the
  overshoot easing with `cubic-bezier(0.2, 0.8, 0.2, 1)`; delete the vestigial `body`
  transition; add enter/exit transitions to dialogs, `FloatingPanel`, the account sheet and
  the Library drawer (whose own comment already claims one). *Small–medium · visual polish.*
- **P2-4 · Library horizontal scroll and mobile nav.** `min-w-[720px]/[800px]` and the
  horizontally-scrolling non-sticky `TopNav`. Needs a real responsive decision. *Medium · UX.*
- **P2-5 · A real "get started" path.** Paired with P2-1: a short dismissible first-run
  path, or a "load sample deck" action in the Library empty state. `TODO.md` §"Onboarding demo in the app" already
  records this. *Medium · UX + conversion.*
- **P2-6 · PWA install / update affordance.** *Small · desirability.*
- **P2-7 · Toolbar height and control consistency.** Review history stacks a 26px toggle,
  a 32px dropdown and a 44px dropdown in one row; `DateRangePicker` and
  `DeckScopeDropdown` have different chrome and neither closes on Escape. *Small · UX.*
- **P2-8 · Deck identity.** Replace the derived monogram (`TODO.md` §"Deck identity"). *Medium.*
- **P2-9 · Shareable session card** (`TODO.md` §"Shareable results") — essentially a rendered completion
  screen, so only after P1-1, and a natural extension of the motivational work in P1-10.
  *Medium · conversion + delight.*
- **P2-10 · Move `/design-preview` behind the auth gate or an env flag.** *Tiny.*

### P3 — Optional / future

Display type scale for page headings (the marketing site's `clamp()` treatment, adapted) ·
route-transition motion · dark mode · a real milestone entity, only if validation asks ·
a cross-platform icon set (see the caution below).

---

## PASS 5 — Strongest recommendations

### The five changes most likely to make Itera feel dramatically more polished

*Separate from the five: **connect the early-access form** (P0-1). It is not a polish item
and it does not compete with them — it is simply the one thing that must be true before the
marketing page is linked anywhere.*

1. **Rebuild the session completion screen into a real session summary** (P1-1, with the
   positioning bug P0-4). The payoff for the entire core loop is currently a mispositioned
   white box reading "All done / Reviewed 12 cards.", on the surface most likely to end a
   demo video. This is also the anchor for all of P1-10 — build it and the other three
   motivational moments become cheap.
2. **Remove the twenty "Soon" markers for the validation build** (P0-2). You already made
   this exact call on mobile; it is a small change that deletes the dominant "unfinished"
   signal from four screens.
3. **Establish one loading standard and one empty-state standard** (P0-3 + P1-5). Ten bare
   `Loading…` strings, one page that flashes a false empty state, one that renders blank,
   and five different empty-state treatments — replaced by two conventions.
4. **Consolidate the primitives** (P1-4). The seven button paddings, four conflicting
   hovers, six stray radii and five `<h1>` styles are the invisible reason the product
   reads as assembled rather than designed. This is the one nobody would put on a list from
   a screenshot, and it is the one that changes the feeling most.
5. **Make the review loop feel rewarding** (P1-2 + the rest of P1-10). Animate the answer
   reveal with the `.reveal-in` class you already wrote, and mark the streak increment,
   deck mastery and return-after-a-gap on numbers the product already computes. Together
   these turn a correct loop into one worth coming back to — without a single new entity.

### If you had one week

**Day 1 — Unblock the link, then clear the frame.** Connect the early-access form to real
storage with a real success state (P0-1), and add `index.html` metadata plus the SVG
favicon (P1-11, first half). Then apply D409 to web: strip the 7 Progress rows, the 8
account-menu rows and the 6 inert settings sections, and point `DEFAULT_SECTION` at
`import-export` (P0-2). Append the decision entry.

**Day 2 — One loading standard.** Add the skeleton primitive and the "frame always renders"
convention across Today, Progress, Library, the deck page and Review; give
`LibraryBrowserPage` a loading branch and `LibraryDeckPage` something other than `null`
(P0-3). Verify in Chromium at 1440×900 and 390×844.

**Day 3 — Fix the payoff.** Fix the completion screen's positioning (P0-4) and rebuild it
as a real session summary: cards reviewed, the rating breakdown, time taken, next due, and
**the streak increment marked where it is earned** — with a calm 350–600ms transition and
copy in `greetings.ts`'s voice (P1-1, and moment 1–2 of P1-10).

**Day 4 — Finish the motivational layer.** `.reveal-in` on the answer reveal (P1-2). Deck
mastery and return-after-a-gap (moments 3–4 of P1-10). This is the day the loop stops being
merely correct and starts being worth returning to.

**Day 5 — The cheap high-return wins.** Redesign `EmptyState` and route Progress's four
bare empty states through it, plus a Progress zero-data state (P1-5). Row hover and the 22
snapping hovers (P1-7). Recall validation (P1-3).

**Day 6 — Consolidate and govern.** The primitive pass: one Button, one hover rule, one
`<h1>`, token radii, the 6px→9px focus ring, the 8 broken transition pairs (P1-4). Add
`--itera-accent-text`, darken `--itera-muted`, update `tokens.ts` in the same pass (P1-6).
Write the §Voice and tone section and sweep the copy, including the defect list in P1-9
(P1-8, P1-9).

**Day 7 — Verify and record.** Full browser pass at 1440×900 and 390×844 across Today,
Library, a deck, all six interaction types, completion, Progress and Settings. Run
`npx vitest run`, `npx tsc -b --force`, `npm run lint`. Update `CURRENT_STATE.md` and append
the decision entries. Then **record the 20–40 second product video for the marketing site's
demo slot** — with the app in this state it will hold up.

**And then stop and post it.** The P2 items are refinements you should be buying with user
feedback, not with more solo polish time.

### What you should explicitly NOT touch

- **The palette.** Navy + orange + slate is right. The only color work worth doing is P1-6,
  which adds a text-safe orange *without* changing the brand orange.
- **`SuggestedSessionHero`.** Owner-locked by D413. Do not adjust offsets, rotations,
  colors, the stagger or the geometry incidentally. It is the best thing in the app.
- **The IA.** Do not re-add a global search or a global create — both were removed as a
  reasoned product call. Do not add a sidebar, a bottom nav, or chrome to Review.
- **The Review layout.** `design-system.md:265` names what was tested and rejected: global
  nav, the logo, the upcoming queue, card-information and session-statistics panels. Do not
  add any of them. (A slim session progress bar in the top strip is the one arguable
  addition, and it is P2 at best.)
- **The two-card crossfade on card advance.** D100 considered and rejected it.
  `.itera-card-enter` is the settled answer.
- **Confetti, spring physics, floating decoration, bounce easing.** Forbidden by
  `design-system.md:322`, and wrong for this audience regardless.
- **A gamification *subsystem*: XP, currency, levels, leaderboards, arbitrary achievements,
  or a Weekly Goal.** Each invents a second scoring model competing with FSRS and needs a
  persisted entity and a settings surface behind it. D209 and D210 refused to fabricate a
  goal or achievement entity and were right.
  **This is not a ban on motivational design, and the two must not be conflated.** Streak
  feedback, mastery moments, session summaries, progress celebration, daily-consistency
  signals and a satisfying end to a review are light gamification, they are in scope, and
  they are P1-10 — a reward layer over mechanics that already exist, with no new scoring
  model underneath. The rule is: *don't add a subsystem; make the existing loop more
  rewarding.*
- **The stacked-card motif as decoration.** `design-system.md:228` forbids it outside the
  logo, nav, onboarding, the Today hero and completion moments — the named failure mode is
  *"look, here are more stacked cards because the logo has stacked cards."* The completion
  screen is a sanctioned spot; nothing else new is.
- **The "orange-wavy shape on each page"** (`TODO.md` §"Color"). I'd push back. It conflicts
  directly with the locked orange-as-signal rule (`design-system.md:182`: one primary
  orange action plus two or three minor accents per screen). A decorative orange shape on
  every page turns your signal color into theme paint, and it is exactly the move that
  reads as *template* rather than *considered*. If you want more character on page grounds,
  copy the marketing site's restraint instead: one large, very low-contrast geometric mark
  per dark section — its `430px { }` glyph at 2.5% white is the right idea.
- **A new icon set, for now** (`TODO.md` §"Icons"). I don't think lucide is your problem. The
  icons are consistent, correctly weighted and correctly sized, and D442 shows you already
  fix them when one carries the wrong *meaning*. What actually reads as unpolished around
  them is the thin low-contrast text (P1-6), the undesigned surfaces they sit in (P1-5),
  and the fact that several are decorative dead affordances — three tooltip-less `Info`
  icons, an unwired `<Star>`, a camera badge on an inert avatar (P1-9). Fix those and
  re-evaluate. Commissioning and standardising a custom set across two platforms is a
  multi-week project with real regression risk and should not precede validation.
- **Dark mode.** Deferred by spec §36; re-authoring 16 tokens plus the CodeMirror palette
  is not a pre-validation project.
- **The honesty doctrine.** Keep refusing to fabricate data. P0-3 is *not* a violation of
  it: removing an unbuilt row is what D409 decided; faking the feature would be the
  violation.

---

## Verification

This run changed nothing, so verification means confirming the **[verify]** items and
establishing a baseline before any of the work above:

1. `npm run dev`, then drive Chromium via the `playwright` devDependency at **1440×900**
   and **390×844**.
2. Confirm: (a) the completion screen sits flush at the top of the viewport
   (`ReviewSessionV2.tsx:76`); (b) `/settings` lands on the inert Profile section;
   (c) `TopNav` overflow at 390px pushes `StreakBadge`/`AccountMenu` off-screen;
   (d) `LibraryBrowserPage` flashes "No decks yet" on a cold load with decks present;
   (e) the `All Decks` nav row stays highlighted while a Collection is selected.
3. Capture "before" screenshots of Today (loading + loaded + empty), Library, a deck, one
   card of each interaction type, the completion screen, Progress (zero-data and populated)
   and Settings — the comparison set for the week, and the raw material for the demo
   recording.
4. Keep throwaway browser scripts in the session scratch directory, not the repo root.
5. Baseline gates before starting: `npx vitest run`, `npx tsc -b --force`, `npm run lint`
   (current baseline: 113 files / 1088 tests, all clean).
