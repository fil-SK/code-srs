# Documentation index

Two kinds of documents live here — a developer reference (how the app works, right now) and the Itera redesign's own working log (why it's changing, and what's been decided). Don't confuse the two: the reference below describes current behavior; the redesign log describes an in-progress, continuously-updated effort layered on top of it.

## Developer reference

Read these for "how does this work" / "where is X" / "what color/token do I use." Written to be accurate as of the date they were last updated — if something looks stale, trust the code and fix the doc.

- **[`architecture.md`](architecture.md)** — the storage seam, data-access hooks, card-type registries (v1 and v2), routing, FSRS scheduling, and the v1→v2 migration machinery.
- **[`design-system.md`](design-system.md)** — the two token systems (general app tokens vs. Itera's locked palette), typography/spacing, icon conventions, and shared UI-component patterns.
- **[`features.md`](features.md)** — a route-by-route table of what exists today and whether it's original (v1) or part of the Itera redesign.

The root [`CLAUDE.md`](../CLAUDE.md) stays intentionally terse (rules and gotchas for Claude Code); these three files are where the full detail — exact tokens, full hook/registry tables, current feature status — lives.

## Itera redesign log

The redesign's own spec, plan, and decision trail, in the order you'd typically need them:

| File | Purpose | Status |
|---|---|---|
| [`itera-claude-master-spec.md`](itera-claude-master-spec.md) | The full product/UX/visual/implementation spec, mirrored verbatim from its original source. Everything else cites this by section number (e.g. §4.4, §9.5). | **Frozen reference** — not edited; the source of truth other docs derive from. |
| [`itera-redesign-plan.md`](itera-redesign-plan.md) | The phased implementation plan (Phase A–M), grounded in this repo's actual files, with live status per phase. | **Authoritative, continuously updated** — read before starting redesign work. |
| [`itera-decisions.md`](itera-decisions.md) | Append-only decision log (D1, D2, ... in order). Product-owner corrections, architecture calls, implementation gotchas. | **Authoritative, actively maintained** — read the most recent entries first. Never edited in place; superseded entries are appended, not rewritten. |
| [`itera-migration-plan.md`](itera-migration-plan.md) | The concrete data-migration contract: the `MigrationRunner` interface, the 8→6 card-type mapping, CardState extraction steps, the Collection/Deck split's preflight requirements. | **Authoritative, living** — still current, phases not yet fully executed. |
| [`itera-repository-audit.md`](itera-repository-audit.md) | The original Phase A audit: pre-redesign stack, spec-conflict table, Retain/Migrate/Rewrite/Delete map. | **Historical** — a few rows have later "Resolved" annotations; don't treat unannotated rows as current state without cross-checking `itera-decisions.md`. |
| [`ai-card-prompt.md`](ai-card-prompt.md) | A copy-paste prompt for generating flashcard-import JSON via an external LLM chat, for **Settings → Import JSON**. | **Standalone user-facing tool doc** — still describes the v1/8-type backup schema, not yet updated for the v2 6-type taxonomy. |
