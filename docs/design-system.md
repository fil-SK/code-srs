# Design system reference

Colors, tokens, typography, spacing, icon conventions, and shared UI-component patterns. This is the practical answer to "how do I make a new piece of UI match" — whether that's a new icon, a new panel, or a new page.

There are **two token systems** layered on top of each other. Understanding the split is the key to everything else in this doc.

---

## 1. The two token systems

**General app tokens** — theme-aware (light/dark), defined on `:root`/`[data-theme='light']`/`[data-theme='dark']` in `src/index.css`, driven by a `data-theme` attribute on `<html>` (not `prefers-color-scheme`, so the in-app toggle controls it):

| Token | Light | Dark | Tailwind utility |
|---|---|---|---|
| `--bg` | `#f4f5f8` | `#0b0e14` | `bg-bg` |
| `--bg-elev` | `#ffffff` | `#11151d` | `bg-bg-elev` |
| `--panel` | `#ffffff` | `#151a23` | `bg-panel` |
| `--panel-2` | `#f7f8fa` | `#1b212c` | `bg-panel-2` |
| `--border` | `#e3e6ec` | `#232b38` | `border-border` |
| `--text` | `#1b2130` | `#e6e9ef` | `text-text` |
| `--muted` | `#5d6678` | `#8b94a7` | `text-muted` |
| `--faint` | `#98a0b0` | `#5b6473` | `text-faint` |
| `--accent` | `#6d57e0` | `#8b7cf6` | `bg-accent` / `text-accent` |
| `--accent-soft` | `rgba(109,87,224,.1)` | `rgba(139,124,246,.14)` | `bg-accent-soft` |
| `--green` | `#1f9d63` | `#3fb27f` | `text-green` |
| `--amber` | `#b9802f` | `#d8a657` | `text-amber` |
| `--red` | `#d2515c` | `#e06c75` | `text-red` |
| `--blue` | `#2f74c0` | `#61afef` | `text-blue` |
| `--code-bg` | `#f7f8fb` | `#0d111a` | `bg-code-bg` |
| `--shadow` | `0 8px 30px rgba(20,24,40,.1)` | `0 8px 30px rgba(0,0,0,.45)` | `shadow-[var(--shadow)]` |

`--radius-card: 12px` (`rounded-card`). Fonts: `--font-sans` (Inter stack), `--font-mono` (JetBrains Mono stack) — same names in both themes.

These are exposed to Tailwind via `@theme inline` in `src/index.css`, which makes utilities emit `var(--…)` directly, so `bg-bg`/`text-muted`/etc. swap live the instant `[data-theme]` flips — no rebuild needed.

**Itera-scope tokens** — an additive, **light-only** namespace (`.itera-scope` in `src/index.css`), applied via `IteraSurface`. It does two things at once:

1. Defines the actual `--itera-*` custom properties (the locked brand palette).
2. **Re-points the general tokens above** (`--bg`, `--panel`, `--text`, `--accent`, `--green`, `--amber`, `--red`, `--blue`, `--shadow`, `--code-bg`, ...) to the Itera values, scoped to `.itera-scope` and its descendants only.

This re-pointing is the whole trick: every v1 component already used `bg-bg`/`text-muted`/`bg-accent`-style utilities. Wrapping a subtree in `.itera-scope` reskins it completely with **zero edits to any component inside it** — the global `:root`/`[data-theme]` rules outside the scope are untouched.

### Itera token table (all light-only)

| Token | Hex | Notes |
|---|---|---|
| `--itera-navy` | `#1e293b` | Locked brand color — "foundation" |
| `--itera-orange` | `#ff6902` | Locked brand color — "energy," see §4 below |
| `--itera-canvas` | `#f6f7f9` | Page background |
| `--itera-surface` | `#ffffff` | Card/panel background |
| `--itera-surface-subtle` | `#f9fafb` | Secondary surface (e.g. search pill background) |
| `--itera-ink` | `#172033` | Primary text |
| `--itera-ink-brand` | `#1e293b` | Emphasized text (titles, values) |
| `--itera-muted` | `#64748b` | Secondary text |
| `--itera-muted-light` | `#94a3b8` | Tertiary text |
| `--itera-border` | `#e3e7ed` | Default border |
| `--itera-border-strong` | `#cbd3de` | Emphasized border |
| `--itera-accent` / `-hover` / `-active` | `#ff6902` / `#ea5f00` / `#d95700` | Primary orange + interaction states |
| `--itera-accent-soft` / `-softer` | `#fff2e8` / `#fff8f3` | Tinted orange backgrounds |
| `--itera-navy-soft` | `#eef2f7` | Tinted navy background |
| `--itera-selection-soft` / `-border` | `#f2f6fc` / `#9cb4db` | Selected-state background/border |
| `--itera-success` / `-soft` | `#15803d` / `#ecfdf3` | Maps from `--green` |
| `--itera-error` / `-soft` | `#c2413a` / `#fef2f2` | Maps from `--red` |
| `--itera-warning` / `-soft` | `#b45309` / `#fff7ed` | Maps from `--amber` |
| `--itera-shadow-card` | `0 12px 30px rgba(23,32,51,.08), 0 2px 6px rgba(23,32,51,.05)` | Sparingly — main Review cards, not every row |
| `--itera-shadow-float` | `0 18px 50px rgba(23,32,51,.12)` | Elevated/floating elements |

`--blue` has no dedicated Itera token (informational, not success/warning/error) — it re-points to `--itera-accent-active` instead.

Radii: `--radius-itera-code: 8px`, `--radius-itera-control: 9px`, `--radius-itera-card: 14px`, `--radius-itera-dialog: 16px`, `--radius-itera-pill: 999px` (pills/tags/small labels only — don't round everything equally).

Fonts: `font-itera-sans` (Inter), `font-itera-display` (Inter Tight, used **sparingly** — large expressive moments only, e.g. Today's greeting or a session-completion title), `font-itera-mono` (JetBrains Mono). All self-hosted via `@fontsource` so the offline PWA actually has them cached, not falling back to `system-ui`.

### The intended type/spacing scale (spec, not yet all wired into CSS vars)

From `docs/itera-claude-master-spec.md` §4.5/§5.1 — these describe the *intended* scale; components currently use literal Tailwind utilities (`p-5`, `gap-3`, `text-lg`, ...) rather than a mirrored set of `--space-*`/`--text-*` CSS vars, so treat this table as the reference to match by eye, not a token you can import:

- Type: `xs 12px, sm 14px, md 16px, lg 18px, xl 22px, 2xl 28px, 3xl 36px, display clamp(38px,5vw,58px)`.
- Spacing: `1:4px, 2:8px, 3:12px, 4:16px, 5:20px, 6:24px, 8:32px, 10:40px, 12:48px, 16:64px, 20:80px`. Prefer larger gaps between sections, smaller gaps inside one semantic object.

---

## 2. `IteraSurface` / `ForceLightTheme`

`src/features/reviewV2/components/IteraSurface.tsx`:

```tsx
export function IteraSurface({ children, className }) {
  return (
    <ForceLightTheme>
      <div className={cn('itera-scope', className)}>{children}</div>
    </ForceLightTheme>
  )
}
```

Used by `AppShell` (whole app), `TodayShell`, `PreviewShell` (design-preview), `LibraryPreviewShell` (design-preview/library-shared — the Phase H preview slice; see [`docs/itera-redesign-plan.md`](itera-redesign-plan.md) Phase H), and `ReviewSessionV2` — one shared mechanism, not separate "real" vs. "preview" copies. **Any new top-level surface that should render in the Itera visual system needs to be wrapped in `IteraSurface`** (or already be a descendant of one of the above).

`ForceLightTheme` locally overrides `ThemeContext` (from `src/app/theme.tsx`) to a static `{theme: 'light', ...}` for its subtree — it does **not** touch `document.documentElement` or `localStorage`, so the app's real global theme state is unaffected outside the wrapped subtree. It exists because `CodeView` picks its syntax-highlight *palette* (light `defaultHighlightStyle` vs. dark `oneDarkHighlightStyle`) from live `useTheme()` context, not a CSS variable — without this override, a globally-dark user would see a light Itera code background paired with a dark syntax palette. Only light values are defined in `.itera-scope` (spec §36 defers dark mode), so the app is light-only for now; `ThemeToggle` is unrendered but not deleted, reversible the moment a dark palette exists.

---

## 3. Shared UI components (`src/components/ui/`)

| Component | Purpose | Variants/props |
|---|---|---|
| `Button.tsx` | Base button | `variant?: 'primary' \| 'secondary' \| 'ghost' \| 'danger'` (default `secondary`). `primary`: `bg-accent text-white hover:brightness-110`. `secondary`: `border border-border bg-panel-2 hover:border-accent`. `ghost`: `text-muted hover:bg-panel`. `danger`: `bg-red text-white hover:brightness-110` (`--red` re-points to `--itera-error` inside `.itera-scope`, so it reads as the Itera error color without needing an itera-only token). Base radius `rounded-[9px]`, disabled → `opacity-50 pointer-events-none`. Props are `ComponentPropsWithRef<'button'>`, so `ref` passes through (React 19 ref-as-prop). |
| `Field.tsx` | Labeled form field + shared input classes | Exports `fieldClass`/`selectClass` strings (`rounded-[9px] border border-border bg-code-bg ... focus:border-accent`) used across every card-type editor. `<Field label>` renders an uppercase, tracked-out `text-xs font-semibold text-muted` caption above its children. |
| `FlipCard.tsx` (v1) | CSS-only 3D flip via `.flip`/`.flip-face` in `index.css` | `front`, `back`, `flipped`, `faceClassName?`, `onFrontClick?`. **Known gap:** the front face is a plain `<div onClick>` — no `tabIndex`/role/keyboard handling. Deliberately not fixed in place; see `reviewV2`'s `FlipCard` below for the accessible version used wherever v2 renders. |
| `FloatingPanel.tsx` | Portaled, viewport-aware popover panel anchored to a trigger | `anchor: HTMLElement \| null`, `onClose`, `align?: 'start' \| 'end'` (default `end`), `className?`, `role?`, `ariaLabel?`, `manageFocus?`, `returnFocusTo?`. Positions itself `fixed` against the anchor's rect, flips **above** the anchor when it would not fit below, clamps to 8px from every viewport edge, re-places on scroll (capture) / resize, and closes on outside `mousedown` or Escape. `manageFocus` (default **off**, so the pointer-driven row kebab menus are unchanged) adds real menu keyboard semantics: focus moves to the first non-`aria-disabled` `role="menuitem"` once the panel has been *measured* (focusing it earlier is a silent no-op — the panel is `visibility: hidden` until then), Arrow/Home/End walk the items with wrapping, Tab closes, and on unmount focus returns to `returnFocusTo` unless the user has already moved it elsewhere. |
| `dialogs.tsx` | In-app replacements for `window.confirm` / `window.prompt` / `window.alert` | `<DialogProvider>` (mounted in `src/app/providers.tsx`) + `useDialogs()` → `{ confirm, prompt, alert }`, all promise-based so call sites read like the blocking builtins: `if (await dialogs.confirm({ title, description, danger }))`. `prompt` resolves the trimmed value or `null`; its submit button is disabled while empty. Rendered as a portaled modal with a `rgba(23,32,51,0.45)` scrim, `rounded-itera-dialog` surface, Escape/scrim-click to dismiss, autofocus on the input (or the confirm button). |

Both `FloatingPanel` and `dialogs` portal into `document.body`, which sits **outside** `.itera-scope` — so each portal re-applies the `itera-scope` class on its own root and cancels that class's canvas `background` with an inline `background: transparent` (an overlay must not paint the page ground). Any future portal has to do the same or its `itera-*` tokens resolve to nothing.

`src/lib/cn.ts` — `cn(...inputs) = twMerge(clsx(inputs))`. Standard clsx (resolves conditional/falsy args) + tailwind-merge (resolves conflicting Tailwind classes on the same CSS property, so a trailing `className` prop can safely override earlier classes) combo. Use this for all conditional/merged class strings.

`src/lib/id.ts` — `newId() = crypto.randomUUID()`. The one ID convention for every entity in the app.

---

## 4. Icon conventions

Icons come from **`lucide-react`** — there are no custom hand-drawn SVG icon files in this app (the one exception is a small bracket motif and a logo-derived watermark inside `SuggestedSessionHero.tsx`, both explicitly one-off, see §6). To add a new "icon," pick one from lucide's set — its stroke width/style matches automatically — and drop it into the same wrapper pattern already used nearby.

**The circular badge pattern** (`src/features/today/MomentumPanel.tsx`), the most common treatment for a labeled icon in a list row:

```tsx
<div className="grid h-9 w-9 flex-none place-items-center rounded-full border border-itera-border bg-itera-surface text-itera-accent">
  <Icon size={16} />
</div>
```

A 36px circle, thin border, orange icon on a white surface — lucide icons inherit `currentColor`, so the wrapper's `text-itera-accent` is what colors the icon, not a prop on the icon itself.

Other conventions seen across `src/features/today/*.tsx`:
- **Sizes**: 14–16px for inline/list icons, 15px for nav/chrome icons (search, plus, play). No larger icon sizes in current use.
- **Inline chrome icons** (nav search, "Create" button) sit at `gap-1.5`–`gap-2` next to text, not inside a circular badge — badges are reserved for list-row icons, not nav/action chrome.
- **Trailing affordance**: `ChevronRight` at 14–16px, colored `text-itera-muted` (decorative) or `text-itera-accent` (a clickable "Continue"/"View more" link).
- **Non-icon badges**: `ContinueLearningList.tsx` uses short text/glyph badges (`'C++'`, `'⚙'`, `'IR'`) inside a square `rounded-itera-control` navy tile with white mono text — a variant of the same wrapper idea for content that isn't a lucide icon.

**The orange-usage rule (locked, spec §4.4):** orange is a *signal*, not theme paint. Reserved for: primary actions, the active-nav marker, the current important metric, session-progress accents, small branded focus details. **Not** meant to color every icon/progress-bar/tag/row simultaneously. Rule of thumb: **one primary orange action + at most two or three minor orange accents per screen.** (This is why the sidebar's active-item treatment is a left accent bar + light tint, not a solid orange pill — see `itera-decisions.md` D48.) When adding a new icon, default to `text-itera-muted` or `text-itera-ink-brand` unless it's genuinely one of the few orange-worthy elements on that screen.

---

## 5. Markdown / RichText (`src/components/text/RichText.tsx`)

A deliberately small, custom markdown subset — not a full parser, no `dangerouslySetInnerHTML` (nodes are built as real React elements, XSS-safe by construction). Supported syntax:

- Fenced code blocks: ` ```lang\n...\n``` ` → rendered via `LazyCodeView` (real CodeMirror), default language `text`.
- Inline code: `` `code` `` → `<code>` styled `rounded-[5px] bg-panel-2 px-1.5 py-0.5 font-mono text-[0.875em] text-accent`.
- **Bold**: `**text**`, *italic*: `*text*` (bold matched first so `**` wins over `*`).
- Plain paragraphs render in a `whitespace-pre-wrap` div.

Two entry points: `RichText` (block-level — handles fences + text) and `InlineText` (inline-only, for short labels like MCQ options, no wrapping element).

**Underscores are never emphasis markers** — the regex only matches `*`/`**`, never `_`/`__`. This is deliberate: flashcard content is often code-adjacent, so `snake_case_identifiers` render literally instead of being mangled by an underscore-based emphasis rule. Do not pull in a markdown library that would reintroduce this.

---

## 6. Code display (`src/components/code/`)

`CodeView.tsx` — a read-only CodeMirror 6 view: line numbers, non-editable, line wrapping, transparent background (so the wrapping container's `--code-bg` shows through), JetBrains Mono at 13px. Syntax palette is chosen from live `useTheme()` (`oneDarkHighlightStyle` vs `defaultHighlightStyle`) — this is exactly why `ForceLightTheme` (§2) has to exist wherever `.itera-scope` is used.

`highlightLines?: number[]` (1-based) tints specific lines via a custom read-only `StateField`, styled as `background: var(--accent-soft)` + `box-shadow: inset 3px 0 0 0 var(--accent)` (tinted background + left accent bar) — used for a walkthrough step's "focus here" range. `src/components/code/lineRanges.ts`'s `parseLineRanges` turns a human-friendly string (`"26-34, 40, 42-45"`) into a sorted, deduped line-number array.

`LazyCodeView`/`LazyCodeEditor` are `React.lazy()` wrappers (via `src/lib/lazyWithRetry.ts`'s `importWithReload`) around `CodeView`/`CodeEditor` — CodeMirror plus language grammars are heavy, kept out of the initial bundle, loaded on first actual use. `importWithReload` also recovers from a stale/missing chunk after a deploy (reloads once).

---

## 7. Shape and logo usage rules (spec, locked)

- **Don't nest decorative containers.** A code block inside a flashcard is fine; a metric card nested inside a stat card nested inside a dashboard panel is not (§4.6).
- **Radius isn't uniform** — code surfaces stay more rectangular; tables/lists often use open rows + separators instead of one bordered container per row.
- **The logo/stacked-card motif is locked to specific sanctioned spots**: main nav, onboarding/launch, the Today session hero, completion/branded transitions (§4.2). It is explicitly **forbidden** as a general decoration — not on every deck cover, not behind every card, not repeated as filler. `SuggestedSessionHero.tsx`'s stacked-layer treatment is called out in its own comments as the one sanctioned reuse of this motif outside the logo itself; don't lift that pattern into new components.
