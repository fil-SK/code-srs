# Roadmaps

A **Roadmap** is a directed graph that arranges decks into a learning order.
Decks stay standalone and unordered; a roadmap is an **overlay** on top of them,
one per topic (e.g. "C++", "MLIR"). Nodes are positioned visual references to
decks (not the decks themselves), and edges are directed prerequisites
("study `from` before `to`" — the arrow points to what to study next).

## Data model (`src/types/roadmap.ts`)

```ts
interface RoadmapNode { id: ID; deckId: ID; x: number; y: number } // board coords, px
interface RoadmapEdge { id: ID; from: ID; to: ID }                 // node ids; directed
interface Roadmap {
  id: ID; title: string; description?: string
  nodes: RoadmapNode[]; edges: RoadmapEdge[]
  createdAt: Millis; updatedAt: Millis
}
```

A deck can appear in many roadmaps; within one roadmap the deck picker filters
out already-added decks (one node per deck per roadmap).

## Storage — a new entity, cheaply

Roadmaps reuse the generic `CrudRepo<T>` seam, so wiring is mechanical:

- `src/data/repository.ts` — `roadmaps: CrudRepo<Roadmap>` on `Repository`.
- `src/data/dexie/db.ts` — **Dexie `version(2)`** adds the `roadmaps` store
  (existing stores carry forward; local data migrates automatically).
- Both backends: one `crud(...)` line in the constructor.
- `supabase/schema.sql` — a `roadmaps` table + `enable row level security` +
  an `own rows` policy + **`grant … to authenticated`** (the grant is what
  prevents the 403 — see `CLAUDE.md`). This block must be run by hand in the
  Supabase SQL editor; it is idempotent (`if not exists`, `drop policy if
  exists`).
- Included in backup export/import (`src/data/backup.ts`), added **optional** in
  `BackupData` so older backups still load.
- `src/hooks/useRoadmaps.ts`, `qk.roadmaps` / `qk.roadmap(id)`, a **Roadmaps**
  nav item (`navItems.ts`, between Decks and Review), and routes `/roadmaps`
  and `/roadmaps/:id`.

## UI (`src/features/roadmaps/`)

- `RoadmapsPage.tsx` — list / create / delete.
- `RoadmapEditorPage.tsx` — owns the **local draft** (source of truth while
  editing) and persists each change via `useSaveRoadmap`. The draft is seeded
  from the query **only when `draft.id !== data.id`**, so a save's refetch never
  clobbers an in-flight edit. Toolbar: rename + a deck picker that adds nodes.
- `RoadmapCanvas.tsx` — a **hand-built SVG canvas, no graph library** (chosen to
  match the app's lean, zero-dep style; topic graphs are small).

### Canvas interaction model

- The in-flight gesture lives in a **ref** (`interaction`), so the window
  pointer listeners always read the latest without re-subscribing. Node moves
  and pending edges render from local state; positions commit up **on
  pointerup** (one save per drag, not per frame).
- **Move:** pointer-down on a node body. **Connect:** drag from a node's right-
  edge dot; the drop target is found with `document.elementFromPoint` +
  `closest('[data-node-id]')`. Buttons/handles `stopPropagation` on pointerdown
  so they don't start a move.
- **Edges** are drawn between node-border anchor points (`borderPoint`) with an
  arrow marker; a fat transparent hit-line makes them easy to click/select, and
  a selected edge shows a delete button at its midpoint.
- Each node has **Open** (`/decks/:id`) and **Study** (`/review?deck=:id`)
  links; a node whose deck was deleted renders "(deleted deck)".
- No pan/zoom in v1 — a fixed large board (`BOARD_W`/`BOARD_H`) inside an
  overflow-auto wrapper.

## Not done / possible next steps

- No pan/zoom or minimap (would be the reason to reach for React Flow later).
- Label-only / milestone nodes (not tied to a deck) are not supported.
- Roadmap visibility mirrors decks; if an owner/public-guest model lands, apply
  the same policy here.
