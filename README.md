# code-srs

A personal, code-first spaced-repetition app for learning software engineering, computer science, compilers, and C++. Unlike a generic flashcard tool, **code is a first-class concept**: cards can show syntax-highlighted snippets, ask you to complete or debug code, and auto-grade typed answers. Reviews are scheduled with the modern **FSRS** algorithm.

It runs entirely in the browser as an installable PWA, works offline against local storage, and optionally syncs across devices through a free Supabase backend.

> **Live:** https://code-srs.vercel.app

### Disclaimer

This app was developed fully with the assistance of Claude AI. The primary reason for this app was to build "Anki for Software Engineers". This tool can be used for learning, improving on software development related topics, for job preparation etc. Therefore, of the essence was the functionality of the app and not learning-side of the process.

---

## Highlights

- **6 focused card interactions**, several with code-aware variants (see below).
- **FSRS scheduling** (via `ts-fsrs`) with a 4-button self-grade bar and auto-grading where it makes sense.
- **Nested decks** of arbitrary depth, with drag-and-drop **card reordering**, deck **reparenting**, and **move-card-between-decks**.
- **Light markdown** in every card: inline `` `code` ``, **bold**, *italic*, and fenced ```code``` blocks rendered with real syntax highlighting.
- **Decks tab, per-deck view, Browse, and an interactive Preview** — try cards (answer + check yourself) with no scheduling impact.
- **Optional Explanation** on every card type, shown on reveal.
- **Draft inbox** for capturing ideas quickly and converting them into cards later.
- **Progress**: learned and due cards, review volume, mature-material retention, current streak, activity, and actionable per-deck metrics.
- **Import / Export** your whole collection as JSON.
- **Dark/light theme**, responsive, mobile-friendly, installable (PWA).
- **Two storage modes**: local-only (IndexedDB, zero setup) or cloud sync (Supabase Postgres + magic-link auth).

---

## Card types

| Interaction | What it drills | How you answer |
| --- | --- | --- |
| **Recall** | Free-form Q&A, reading a snippet, or spotting a defect | Flip to reveal, self-grade |
| **Multiple Choice** | Single- or multi-correct choice | Select answer(s), auto-graded |
| **Write Code** | Writing the right code | Type the answer, auto-checked against accepted solutions |
| **Ordering** | Correct sequence/steps | Drag items into order, then submit explicitly for auto-grading |
| **Matching** | Associating concepts | Pair items across columns, auto-graded |
| **Walkthrough** | Multi-step scenarios (e.g. tracing code execution) | Walk through steps one at a time, reveal or submit each, then rate once at the end |

Recall covers what used to be three separate types (plain Q&A, code reading, bug finding); an authoring preset picks the right editor layout for each.

Notable variants:

- **Multiple Choice** prompts support fenced code blocks, so you can ask "what does this print?" with a real snippet, and options can themselves be inline code. Toggle **multiple correct answers**, which shows a "Select all that apply" hint to the learner.
- **Write Code** can be a classic "fill the blank in this scaffold" card, **or** a plain prose question with an empty scaffold ("How do you reverse a list in Python?" → type `lst[::-1]`). Accepts multiple solutions with whitespace/case normalization.
- **Matching** supports an optional **third column** (3-part: `A → B → C`), optional **bold column headers**, and per-column **fixed-option ("dropdown") columns** — a column can share one value list (e.g. Yes/No) graded by value, so rows can repeat answers. Rows are reshuffled each open so the answer pattern can't be memorized by position.
- **Walkthrough** supports optional card-wide Tip/Explanation fields plus optional guidance for each individual step. A step's tip appears before its answer is submitted; its explanation replaces the tip afterward and remains available when that step is revisited.

Every interaction also has an **optional Tip** (shown before you answer) and **optional Explanation** (shown on reveal), and all prose fields accept the markdown above.

Grading model: interactive interactions (Multiple Choice, Write Code, Ordering, Matching, Walkthrough) **auto-decide** pass/fail, then you can still override on the grade bar. Recall flips to reveal and you rate yourself **Again / Hard / Good / Easy**.

---

## Using the app

- **Dashboard** — a greeting and an overview: due / total / deck counts, plus quick "Study due" and "Manage decks" actions.
- **Library / All Decks** (`/decks`) — browse descriptive deck rows with card, due, last-studied and progress metrics; search, filter, sort and move through ten-deck pages with visible-range counts. Create decks from the orange header action or use Import Deck to open the app's JSON Import & Export settings. The local Collection tree supports nesting, rename, delete and reparenting.
- **Deck page** (`/decks/:id`) — Cards/Insights with search and filters, seven cards per page, and Deck settings for rename/description/reparenting. Settings closes after Save, Cancel, or clicking Deck settings again. Click a row to preview it; its action menu handles edit/duplicate/move/suspend/delete. V1 cards can still be drag-reordered within the visible manual-order page.
- **Review** — the due queue. Reveal, then rate with the icon-led Again / Hard / Good / Easy controls; each choice previews its real next FSRS interval. Grade and undo remain keyboard-friendly, and queue order is independent of manual card order.
- **Browse** — all cards across decks with text/type/tag filters; the same per-card actions as the deck page.
- **Preview** — try cards with **no scheduling impact** through the same card surface as Review. In deck flip-through, Prev and Next flank the position in the white strip; the Left/Right arrow keys perform the same navigation. Ratings are hidden and nothing is recorded.
- **Drafts** — capture rough notes, then convert each into a fully-formed card.
- **Progress** (`/progress`) — Learned, Due, Reviews, mature Retention, and Current streak; activity and retention charts; actionable leaf-deck rows ordered around work due now. Today, navigation, Progress, and Review share the same due/streak/retention definitions.
- **Account settings** (`/settings`, from the avatar in the top-right) — JSON import/export and the card-scheduling migration tool. The avatar menu also links those two working sections directly and shows Study settings, What's new, keyboard/help and profile destinations as clearly marked upcoming items. Sign-out is available there for local, demo and cloud sessions.

**Markdown** works in every card's prose: `` `inline code` ``, `**bold**`, `*italic*`, and:

````text
```cpp
int x = foo(a, b);
```
What does `foo` return when `a == b`?
````

---

## Storage & sync

The app talks to storage through a single repository interface, with two interchangeable backends:

- **Local (default).** With no configuration it uses **IndexedDB** (Dexie). Everything stays in that browser. Zero setup, fully offline — but not shared across devices.
- **Cloud (optional).** Provide Supabase credentials and it uses **Postgres** with per-user **Row Level Security** and **magic-link** sign-in, so your cards sync across every device. Online-first.

You can move data between modes (or make a backup) anytime via **Account settings → Import / Export**.

---

## Run it locally

**Prerequisites:** Node.js 20+ and npm.

```bash
git clone https://github.com/fil-SK/code-srs.git
cd code-srs
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). With no `.env.local`, it runs in **local-only mode**: data stored in your browser, no server, no account.

You land on `/login` first. There is no accounts backend in local mode, so it is a session boundary rather than authentication — **Continue with demo workspace** gets you straight in, or sign in with any email and password (the password is never stored, sent, or checked). Signing out from the avatar menu returns you here. With Supabase configured, the same page sends a real magic link instead.

The login is a compact, mockup-driven split surface using Inter Variable throughout. Its product panel carries the real Itera mark, a three-card equal-width learning fan, and the Local-first / Private by default / Built for engineers principles; the form stays intentionally quieter on the right.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with oxlint |
| `npm run test` | Run the Vitest unit suite |

---

## Enable cloud sync (Supabase)

Free and takes a few minutes.

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the tables, generated columns, indexes, Row Level Security policies, and grants.
3. In **Project Settings → API**, copy your **Project URL** and **publishable** key (`sb_publishable_…`; the new name for the anon key — safe to expose, RLS protects your data). Never put the secret key in the frontend.
4. In **Authentication → URL Configuration**, set the Site URL and add your dev/prod URLs (e.g. `http://localhost:5173`) to the redirect allow-list.
5. Copy `.env.local.example` to **`.env.local`** and fill in:

   ```env
   VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
6. Restart `npm run dev`. You'll now get a sign-in screen; enter your email and click the magic link.

> Env vars are read at build time. After changing `.env.local`, restart the dev server (or rebuild).

---

## Deploy to Vercel

The app is a static build plus a Vercel rewrite (already in [`vercel.json`](vercel.json)) so client-side routing survives refreshes.

1. Push the repo to GitHub.
2. On [Vercel](https://vercel.com), **Add New → Project** and import the repo (connect GitHub if needed). It auto-detects Vite (`npm run build` → `dist/`).
3. Add the two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) for the **Production** environment.
4. Deploy. Add your Vercel URL to the Supabase **redirect allow-list** (step 4 above) so magic links return to the site.

Every push to `main` then auto-deploys. The PWA (`registerType: 'autoUpdate'`) refreshes clients automatically after a deploy.

---

## Generating cards with AI

Want to bulk-create cards from study material? [`docs/prompts/ai-card-prompt.md`](docs/prompts/ai-card-prompt.md) is a ready-made prompt you can give another AI chat: it explains the current JSON backup schema (version 2) and all six interaction shapes. Paste your notes, get back a JSON file, and load it via **Account settings → Import / Export → Import JSON → Merge** (additive — it only overwrites an entity whose `id` already exists).

Imports are validated before anything is written. If a generated file has an unsupported interaction type, a malformed card or scheduling block, or a card whose deck does not exist, the import is refused with a message naming the offending entity, and nothing is stored.

---

## Tech stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS v4** for styling, **React Router** for routing, **TanStack Query** for data fetching/caching
- **ts-fsrs** for scheduling, **CodeMirror 6** for code display/editing (lazy-loaded)
- **@dnd-kit** for drag-and-drop, **vite-plugin-pwa** for the installable/offline shell
- **Dexie** (IndexedDB) and **Supabase** (Postgres) behind one repository interface
- **Vitest** for tests, **oxlint** for linting

---

## Project structure

```
src/
  app/         providers, router, theme, query client
  auth/        session boundary (provider, route guard, local/demo session)
  components/  shared UI (buttons, fields, code views, RichText markdown)
  data/        repository interface + Dexie and Supabase backends
  domain/      pure logic: scheduling, grading, search, stats, decks, migration, io
  features/    cards, library, login, preview, progress, review, reviewV2,
               roadmaps, settings, today
  hooks/       TanStack Query hooks
  types/       entity types (Card discriminated union, Deck, Draft, ReviewLog)
supabase/      schema.sql + migrations/ for cloud setup
docs/          shared documentation (see docs/README.md)
```

See [`docs/README.md`](docs/README.md) for the documentation index, and [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) for what is actually implemented right now.

---

## Developer documentation

For a full technical reference beyond this README — exact color tokens, the complete storage/hooks/registry architecture, and a route-by-route feature table — see [`docs/README.md`](docs/README.md), the index and source-of-truth hierarchy for:

- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — what is actually implemented right now, known problems, and the next milestone. **Start here.**
- [`docs/architecture.md`](docs/architecture.md) — storage seam, data hooks, card-type registries, auth boundary, routing, scheduling, migration machinery.
- [`docs/design-system.md`](docs/design-system.md) — brand, tokens, typography, navigation, motion, accessibility, responsive rules.
- [`docs/features.md`](docs/features.md) — current feature/page inventory, plus what is planned and what is out of scope.
- [`docs/itera-decisions.md`](docs/itera-decisions.md) — the append-only decision log.

Project history (the original repository audit, the phased redesign plan, and the original master spec) is preserved under [`docs/archive/`](docs/archive/) and is **not** a current source of truth.

---

## License

Personal project — no license specified. If you'd like to reuse it, open an issue.
