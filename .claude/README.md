# .claude

Project-scoped notes for Claude Code (and humans). High-level architecture,
commands, and conventions live in [`../CLAUDE.md`](../CLAUDE.md); this folder
holds deeper, feature-specific design docs — data models and the reasoning
behind them, which the code alone does not spell out.

## Features

- [features/story-cards.md](features/story-cards.md) — the Story card type
  (multi-step assignments) and per-step shared-code line highlighting.
- [features/roadmaps.md](features/roadmaps.md) — Roadmaps: learning-order
  graphs whose nodes reference decks.

Both features were added on top of the existing registry / repository seams
described in `CLAUDE.md` with no changes to FSRS, the review flow, or (for
Story) the database.
