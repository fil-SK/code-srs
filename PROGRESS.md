# code-srs — Progress Log

A running log of what we build and change, newest first. Each entry notes the
milestone, what changed, and the commit it maps to. See [DESIGN.md](./DESIGN.md)
for the architecture and [mockup.html](./mockup.html) for the visual reference.

## How we work
- Changes are grouped into **milestones** (M0–M8, see DESIGN.md §10).
- After each logical change, a **commit checkpoint** is called out with a ready
  commit message. Format: [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`, `test:`).
- Nothing is committed automatically — the message is provided for you to run.

---

## Decisions added after initial design
- **Flip-to-reveal animation** for self-graded cards (Basic, Code Reading, Bug
  Finding): tapping the card rotates it to show the answer, then the grade bar
  appears. Tall code snippets use a smooth slide/expand reveal instead of a 3D
  flip (flip is awkward for long content on mobile). Finalize per-type in M3.

---

## Log

### 2026-06-23 — M0: project scaffold
- Vite 8 + React 19 + TypeScript 6 project initialized (template `react-ts`).
- Linting via `oxlint` (Vite's current default, replaces ESLint).
- Merged scaffold into repo root; kept DESIGN.md / PROGRESS.md / mockup.html / README.md.
- Renamed package to `code-srs`. `npm run build` passes (tsc + vite build clean).
- **Still in M0:** Tailwind + shadcn/ui setup, folder structure, router, PWA, deploy.
