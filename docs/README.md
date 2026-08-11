# Documentation index

Shared, **agent-neutral** documentation for Itera (the app still named `code-srs` in `package.json` and its deployment). Claude Code reads [`../CLAUDE.md`](../CLAUDE.md) and Codex reads [`../AGENTS.md`](../AGENTS.md); both are thin entry points that point **here**. Product, design, architecture and migration truth lives in this folder and is never duplicated into an agent instruction file.

## Start here

- **[`CURRENT_STATE.md`](CURRENT_STATE.md)** — what is actually implemented right now: current milestone, page-by-page real vs. placeholder, routes (including the legacy ones kept on purpose), architecture state, migrations that have *not* run, known problems, tests/build baseline, and the one recommended next milestone. **Read this before planning any change.**

## Canonical documents

Each owns one concern. If two of them say different things about the same thing, that is a bug — fix it rather than picking a side silently.

| Document | Owns | Does **not** own |
|---|---|---|
| [`CURRENT_STATE.md`](CURRENT_STATE.md) | Implementation status, known problems, next milestone | Rules, rationale, mechanism |
| [`architecture.md`](architecture.md) | How the system is structured: storage seam, hooks, both card registries, auth boundary, scheduling/`ReviewService`, routing, backup, data-safety constraints | What shipped when |
| [`design-system.md`](design-system.md) | How it looks and behaves: brand and logo rules, tokens, typography, spacing, shape, navigation, surfaces, tables/lists, popovers, motion, reduced motion, accessibility, responsive, orange restraint, the Review-shell exception, visual-reference tiers | Component-by-component status |
| [`features.md`](features.md) | What the product does route by route, cross-cutting behavior (interactions, grading, Tip vs Explanation, sessions, login), plus **planned** and **explicitly out of scope** | Why a call was made |
| [`itera-decisions.md`](itera-decisions.md) | **Append-only** material decision log: decision, rationale, date, supersession. Read the newest relevant entries first | Implementation status |
| [`itera-migration-plan.md`](itera-migration-plan.md) | The data-migration and data-safety contract, with every phase marked completed / partial / not started | Anything unrelated to persisted data |

## Other current material

- **[`prompts/ai-card-prompt.md`](prompts/ai-card-prompt.md)** — a copy-paste prompt for generating flashcard-import JSON via an external LLM chat, loaded through **Account settings → Import / Export → Import JSON → Merge**. Active and user-facing. It still describes the **v1 / 8-type backup schema** (`BACKUP_VERSION` is still `1`), which is correct today and will need updating when the backup version bumps.

## Visual references

Reference mockups are **not tracked in this repository** — there is deliberately no `docs/references/` directory, because inventing one would create paths that resolve to nothing. They live at `C:\Users\SK\Desktop\itera-mockups\` (`webapp/`, `inspo-icons/`, `inspiration/`, `mobile/`). [`design-system.md`](design-system.md) §14 defines the **LOCKED / DIRECTION / CONCEPT** tiers and how each is treated; [`itera-decisions.md`](itera-decisions.md) cites individual files by name.

## Historical documents — [`archive/`](archive/)

Preserved for project history. Each opens with a visible warning. **None of them is a current source of truth, and none may override a canonical document.**

| File | What it was |
|---|---|
| [`archive/itera-repository-audit-2026-07-22.md`](archive/itera-repository-audit-2026-07-22.md) | The Phase A audit: a snapshot of the repository **before** the redesign, its spec-conflict table and Retain/Migrate/Rewrite/Delete map. Most conflicts are long resolved. |
| [`archive/itera-redesign-plan.md`](archive/itera-redesign-plan.md) | The phased A–M implementation sequence. Reality deviated from it (the Library/shell rebuild shipped without the Collection/Deck migration; Today shipped early). `CURRENT_STATE.md` defines the next milestone instead. |
| [`archive/itera-claude-master-spec.md`](archive/itera-claude-master-spec.md) | The original Claude-addressed master specification everything derives from. Its durable rules were moved into the canonical docs above; it is kept whole and unedited because the decision log cites it **by section number** (e.g. "spec §4.4"). |

## Source-of-truth hierarchy

When two sources disagree, resolve in this order. Never resolve a conflict in favor of an archived document.

**Current status of anything**
1. The repository itself — read the code
2. [`CURRENT_STATE.md`](CURRENT_STATE.md)
3. [`architecture.md`](architecture.md) / [`features.md`](features.md) / [`design-system.md`](design-system.md)
4. [`archive/`](archive/)

**Design**
1. A visual reference explicitly marked **LOCKED** for that surface
2. [`design-system.md`](design-system.md)
3. The relevant entries in [`itera-decisions.md`](itera-decisions.md)
4. [`archive/`](archive/)

**Architecture**
1. The current repository implementation
2. [`architecture.md`](architecture.md)
3. [`itera-decisions.md`](itera-decisions.md)
4. [`itera-migration-plan.md`](itera-migration-plan.md), where persisted data is involved

**Future migration work**
1. [`itera-decisions.md`](itera-decisions.md) — a later decision supersedes an earlier plan
2. [`itera-migration-plan.md`](itera-migration-plan.md) — the contract itself
3. [`CURRENT_STATE.md`](CURRENT_STATE.md) §13 — which stage each migration is actually at

Two standing rules: **the repository wins over any document** on questions of what exists, and `itera-decisions.md` is **append-only** — supersede an entry with a new dated one, never edit its substance in place.

## Keeping this accurate

When a change reaches finalized state (a feature implemented, a design or behavior settled — not a WIP edit), update documentation **in the same pass**: `CURRENT_STATE.md` whenever status changes, the canonical doc that owns the topic, [`../README.md`](../README.md) for user-facing changes, and a new appended entry in `itera-decisions.md` for anything material.
