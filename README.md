# code-srs

A personal, code-first spaced-repetition app for learning software engineering, computer science, compilers, and C++. Unlike a generic flashcard tool, **code is a first-class concept**: cards can show syntax-highlighted snippets, ask you to complete or debug code, and auto-grade typed answers. Reviews are scheduled with the modern **FSRS** algorithm.

It runs entirely in the browser as an installable PWA, works offline against local storage, and optionally syncs across devices through a free Supabase backend.

> **Live:** https://code-srs.vercel.app

### Disclaimer

This app was developed fully with the assistance of Claude AI. The primary reason for this app was to build "Anki for Software Engineers". This tool can be used for learning, improving on software development related topics, for job preparation etc. Therefore, of the essence was the functionality of the app and not learning-side of the process.

---

## Highlights

- **7 focused card types**, several with code-aware variants (see below).
- **FSRS scheduling** (via `ts-fsrs`) with a 4-button self-grade bar and auto-grading where it makes sense.
- **Nested decks** of arbitrary depth, with drag-and-drop **card reordering**, deck **reparenting**, and **move-card-between-decks**.
- **Light markdown** in every card: inline `` `code` ``, **bold**, *italic*, and fenced ```code``` blocks rendered with real syntax highlighting.
- **Browse, deck detail, and flip-through Preview** modes — review without affecting scheduling.
- **Draft inbox** for capturing ideas quickly and converting them into cards later.
- **Stats**: streak, retention, reviews per day, and a due-forecast.
- **Import / Export** your whole collection as JSON.
- **Dark/light theme**, responsive, mobile-friendly, installable (PWA).
- **Two storage modes**: local-only (IndexedDB, zero setup) or cloud sync (Supabase Postgres + magic-link auth).

---

## Card types

| Type | What it drills | Interaction |
| --- | --- | --- |
| **Basic** | Free-form Q&A | Flip to reveal, self-grade |
| **MCQ** | Single- or multi-correct multiple choice | Select answer(s), auto-graded |
| **Code Reading** | Understanding a snippet | Read code + question, flip to reveal |
| **Code Completion** | Writing the right code | Type the answer, auto-checked against accepted solutions |
| **Bug Finding** | Spotting defects | Read code (optional hint), flip to reveal explanation |
| **Ordering** | Correct sequence/steps | Drag items into order, auto-graded |
| **Matching** | Associating concepts | Match columns via dropdowns, auto-graded |

Notable variants:

- **MCQ** prompts support fenced code blocks, so you can ask "what does this print?" with a real snippet, and options can themselves be inline code. Toggle **multiple correct answers** for "select all that apply."
- **Code Completion** can be a classic "fill the blank in this scaffold" card, **or** a plain prose question with an empty scaffold ("How do you reverse a list in Python?" → type `lst[::-1]`). Accepts multiple solutions with whitespace/case normalization.
- **Matching** supports an optional **third column** (3-part matching: `A → B → C`) and optional **bold column headers**.

Grading model: interactive types (MCQ, completion, ordering, matching) **auto-decide** pass/fail, then you can still override on the grade bar. Self-graded types (basic, code reading, bug finding) flip to reveal and you rate yourself **Again / Hard / Good / Easy**.

---

## Using the app

- **Dashboard** — your deck tree with due/total counts. Click a deck **name** to open it; use ▶ to study and 📖 to flip through.
- **Deck page** (`/decks/:id`) — the deck's cards as a list. **Drag the handle** to reorder, open **Deck settings** to rename/describe/**reparent** the deck, and use each row's actions to **preview / edit / move / suspend / delete** a card.
- **Review** — the due queue. Reveal, grade, undo. Order is driven by FSRS, independent of any manual card order.
- **Browse** — all cards across decks with text/type/tag filters; the same per-card actions as the deck page.
- **Preview** — flip through a deck (or a single card) with **no scheduling impact**. Great for casual recall.
- **Drafts** — capture rough notes, then convert each into a fully-formed card.
- **Stats** — streak, retention, reviews/day, and upcoming load.
- **Settings** — theme, JSON import/export, and (in cloud mode) your account / sign-out.

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

You can move data between modes (or make a backup) anytime via **Settings → Export / Import JSON**.

---

## Run it locally

**Prerequisites:** Node.js 20+ and npm.

```bash
git clone https://github.com/fil-SK/code-srs.git
cd code-srs
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). With no `.env.local`, it runs in **local-only mode** — no login, data stored in your browser.

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

Want to bulk-create cards from study material? [`docs/ai-card-prompt.md`](docs/ai-card-prompt.md) is a ready-made prompt you can give another AI chat: it explains the full JSON backup schema and every card-content shape. Paste your notes, get back a JSON file, and load it via **Settings → Import JSON → Merge** (additive — it won't overwrite existing cards).

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
  auth/        Supabase magic-link auth (provider, gate, login)
  components/  shared UI (buttons, fields, code views, RichText markdown)
  data/        repository interface + Dexie and Supabase backends
  domain/      pure logic: scheduling, grading, search, stats, decks, io
  features/    cards, dashboard, decks, drafts, preview, review, settings, stats
  hooks/       TanStack Query hooks
  types/       entity types (Card discriminated union, Deck, Draft, ReviewLog)
supabase/      schema.sql for cloud setup
docs/          ai-card-prompt.md
```

See [`DESIGN.md`](DESIGN.md) for the architecture and [`PROGRESS.md`](PROGRESS.md) for the build log.

---

## License

Personal project — no license specified. If you'd like to reuse it, open an issue.
