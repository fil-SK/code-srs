# Design system reference

The canonical Itera visual and interaction design system: brand rules, tokens, typography, spacing, shape, navigation, surfaces, motion, responsive behavior and accessibility. This is the practical answer to "how do I make a new piece of UI match" — whether that's a new icon, a new panel, or a new page.

**How to read the labels.** Design rules and shipped code are not the same thing, and this doc marks the difference wherever it matters:

- **DESIGN RULE** — a locked or settled rule that binds new work, whether or not every existing screen already follows it.
- **IMPLEMENTED** — what the code actually does today, including where it deliberately diverges from the rule above it.
- **FUTURE** — intended direction that nothing implements yet. Never build against these as though they exist.

This document owns *how it should look and behave*. It does not track *what is built* — that is [`CURRENT_STATE.md`](CURRENT_STATE.md) — or *why a call was made*, which is [`itera-decisions.md`](itera-decisions.md).

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

Fonts: `font-itera-sans` (Inter) and `font-itera-mono` (JetBrains Mono). The legacy `font-itera-display` utility is retained as a compatibility alias to Inter, so an old explicit display class cannot silently switch a screen to another family. Both fonts are self-hosted via `@fontsource` so the offline PWA actually has them cached, not falling back to `system-ui`.

### Typography rules — DESIGN RULE (locked)

Two families, no more. **Do not add another family or mix decorative fonts.**

- **Inter** — all UI, body, headings, wordmarks, and expressive display text. Weight, size, tracking, and composition create hierarchy without a second sans-serif family.
- **JetBrains Mono** — code, keyboard shortcuts, and selected technical metadata. Nothing else.

**Login implementation:** `/login` inherits Inter Variable from `.itera-scope`, including its `Welcome back` and `Sign in` headings at weight 650. The family was finalized after a controlled comparison against Manrope and Plus Jakarta Sans; those temporary font faces and the selector were removed.

**App-wide implementation:** `.itera-scope` inherits Inter Variable by default. `/` therefore uses it for the greeting and large session-card count without page-specific font classes, while the shared navigation wordmark inherits it at the login wordmark's weight 650. `font-itera-display` also resolves to Inter, covering existing explicit display usages without a page-by-page cleanup dependency.

**Login illustration implementation:** the locked fan is three real DOM cards, each 176px wide, inside a 580x330 decorative canvas. Dynamic Programming is left 52/top 50/−9°; SQL Joins is left 226/top 40/+5°; System Design is left 396/top 30/+9°. Heights remain slightly different, so the equal-width cards still form an intentional asymmetrical stack. Keep every title unobstructed and preserve the literal inline transforms when adjusting this composition.

Hierarchy comes from **type scale, weight, spacing and composition**, not from wrapping things in more containers.

Suggested line heights: UI labels `1.2–1.3`, body `1.45–1.6`, large titles `1.05–1.2`, code `1.5–1.7`.

### The intended type/spacing scale — DESIGN RULE, not a token

These describe the *intended* scale. **IMPLEMENTED:** components use literal Tailwind utilities (`p-5`, `gap-3`, `text-lg`, ...); there is no mirrored set of `--space-*`/`--text-*` CSS vars to import. Match the scale by eye.

- Type: `xs 12px, sm 14px, md 16px, lg 18px, xl 22px, 2xl 28px, 3xl 36px, display clamp(38px,5vw,58px)`.
- Spacing: `1:4px, 2:8px, 3:12px, 4:16px, 5:20px, 6:24px, 8:32px, 10:40px, 12:48px, 16:64px, 20:80px`. Prefer larger gaps **between** sections, smaller gaps **inside** one semantic object.

### Page widths and workspace

**DESIGN RULE — the app is a centered workspace.** Content is centered in a bounded column with real breathing room on both sides; it never runs edge to edge, and no page introduces its own competing outer frame. Every standard page is already inside `AppShell`'s centered `<main>`, so a page renders its own content directly and does **not** add another max-width wrapper around everything.

| Surface | Intended (spec §5.3) | IMPLEMENTED |
|---|---|---|
| Global app content | 1440–1520px | **1280px** — standard `AppShell` routes use a centered `max-w-[1280px]` main with responsive padding, matched by `TopNav`'s inner row so logo and content align. Study-preview routes deliberately receive a full-width, zero-top-padding main so their white Review strip can remain full-bleed. |
| Review content | 1040–1120px | Narrower on purpose: the card is `max-w-2xl` (672px), or `max-w-4xl` (896px) for interactions whose definition reports `widthFor() === 'wide'` |
| Editor + preview | 1440px | **880px at rest**, expanding to **1120px only while the 420px desktop preview is open**. The create route is one bordered panel with three numbered sections, inset separator rules and a bottom action row. Below the wide-editor breakpoint, Editor/Preview tabs replace the drawer — see D168/D169 |
| Text-heavy panel | 760–840px | Followed by eye; no token |

Top bars — **DESIGN RULE:** global nav 68–72px desktop; the immersive Review bar is an 80px full-width white strip at every width, following `recall-card.png`. "Full-width" means the available layout width, never `100vw`/`100dvw`, so a vertical scrollbar cannot create horizontal page overflow. Its background/border stay full-bleed, while its control grid uses the same centered 1280px frame as `TopNav`: Exit aligns with the Itera logo edge and the right hint aligns with the profile-control edge. Exit and the right-side action/status label share the same UI typography; only the keyboard keycap keeps its smaller semibold treatment. The Exit button uses `cursor: pointer` across its complete text target. **IMPLEMENTED:** `TopNav` is `h-16` (64px), while `ReviewTopBar` is `min-h-20` (80px).

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

Used by `AppShell` (whole app), `ReviewPage`, `LoginPage`, `PreviewShell` (design-preview), `LibraryPreviewShell` (design-preview/library-shared — the fixture-driven Library preview slice the production Library was adapted from), and `ReviewSessionV2` — one shared mechanism, not separate "real" vs. "preview" copies. **Any new top-level surface that should render in the Itera visual system needs to be wrapped in `IteraSurface`** (or already be a descendant of one of the above).

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

`LazyCodeView`/`LazyCodeEditor` are `React.lazy()` wrappers (via `src/lib/lazyWithRetry.ts`'s `importWithReload`) around `CodeView`/`CodeEditor` — CodeMirror plus language grammars are heavy, kept out of the initial bundle, loaded on first actual use. `importWithReload` also recovers from a stale/missing chunk after a deploy (reloads once). Both CodeMirror surfaces use the self-hosted `JetBrains Mono Variable` family first and request a fresh geometry measurement after `document.fonts.ready`, preventing fallback-font wrapping from persisting until a scroll or edit.

---

## 7. Shape and logo usage rules — DESIGN RULE (locked)

The shape language is **structured softness**.

- **Don't round every object equally.** Radius is a signal that something is an interactive or semantic object. Code surfaces stay more rectangular (`--radius-itera-code: 8px`); pills are reserved for true pills, tags and small labels.
- **Don't nest decorative containers.** A code block inside a flashcard is fine. A metric card inside a stat card inside a dashboard panel is not. If you are on your third border, delete two of them.
- **Tables and lists use open rows + separators**, not one bordered container per row.
- **Shadows are sparing.** A main Review card may carry `--itera-shadow-card`; most Library rows carry none. `--itera-shadow-float` is for genuinely floating elements (popovers, sheets, dialogs).

**The logo / stacked-card motif is locked to sanctioned spots:** main navigation, onboarding and launch, the Today session hero, and completion or branded transition moments. It is explicitly **forbidden** as general decoration — not on every deck cover, not behind every card, never inside Review content, never as repeated filler. The failure mode named in the brand rules is *"look, here are more stacked cards because the logo has stacked cards."* The motif appears only where it carries meaning.

**IMPLEMENTED:** `SuggestedSessionHero.tsx`'s 4-layer stacked treatment is the one sanctioned reuse of the motif outside the logo itself, and its own file comments say so. Do not lift that pattern into new components. `src/features/reviewV2/ReviewSessionScreen.tsx`'s `.itera-card-enter` next-card entrance is a second, narrower echo of it (the incoming card settles out of an off-stack rotated pose) and is likewise not a general-purpose animation.

---

## 8. Navigation

**DESIGN RULE (locked IA).** One calm horizontal top navigation. Logo left, primary destinations centered-left, account at far right. No permanent dark header, no global left sidebar, no bottom nav forced from desktop onto mobile. The active destination gets a **thin orange marker**, not a filled orange pill.

**IMPLEMENTED** (`src/components/layout/`):

- `TopNav.tsx` is presentational only: logo, primary links, and a `rightSlot`. Its wordmark uses the same Inter Variable/650 treatment as login. It holds no product logic and no per-route title slot.
- `primaryNavLinks.ts` is the single source of truth for the primary destinations, and there are exactly three: **Today (`/`) · Library (`/decks`) · Progress (`/progress`)**.
- The right side holds `StreakBadge` + `AccountMenu`. Nothing else.
- **There is deliberately no global Search and no global `+ Create`.** The original locked IA included both; they were removed as a product call because each is a *scoped* concept — you search within a Library, you create a card within a deck — and a global affordance with no context to act on is worse than none. `CreateMenu.tsx` and `TopNav`'s search control were **deleted, not hidden**. Do not reintroduce either without a decision entry.
- Settings is reached through the account menu, never as a top-level destination. That part of the locked IA holds.
- **Local (page-level) sidebars are the convention for section navigation**, and they are what replaced the deleted global sidebar: `LibraryShell`/`CollectionNav`, `ProgressShell`/`ProgressNav`, `SettingsNav`.

**FUTURE:** a mobile-specific navigation pattern (compact top bar plus a platform-appropriate primary-destination affordance) is specified but not built; the desktop `TopNav` currently just scrolls horizontally on narrow screens.

### The Review-shell exception — DESIGN RULE (locked)

**Review renders none of the above.** It is immersive by construction: a full-width white top strip carrying only a literal **< Exit session** control (not an arrow icon), a bold position ("7 of 23") and a right-aligned shortcut whose key is drawn as a bordered `<kbd>`, then the narrow card column, tip, explanation and rating controls on open space. The same strip renders on the real study-preview routes; those routes receive a full-width, zero-top-padding `AppShell` main so the strip stays full-bleed and sits flush beneath `TopNav`. The strip's inner controls share the nav's centered 1280px frame. Session-backed surfaces use a symmetric 56px vertical frame: 56px from the strip to the card and 56px from the final rendered content (normally rating controls) to the surface bottom. Editor live previews deliberately keep their Question/Answer toggle instead because they have no deck/session position. Revealed preview-only cards say **Answer revealed**; when ratings are present, the hint becomes **Rate your answer** without repeating the numeric shortcuts already visible on the buttons.

Never add to Review: global navigation, the Itera logo, a left sidebar, the upcoming queue, a card-information panel, a session-statistics panel, an explanation of spaced repetition, or persistent deck metadata. Those were tested and rejected because they distract from recall.

**IMPLEMENTED:** `/review` is a **structurally separate top-level route with no `AppShell` ancestor** (`src/app/router.tsx`), so it is chrome-free by construction rather than by hiding the shell with CSS. `/login` and `/design-preview/*` use the same pattern. `ReviewTopBar.tsx` carries exit + counter + shortcut hint and nothing else. Because `AccountMenu` mounts from `AppShell`, Review has no account menu automatically.

**Rating controls — DESIGN RULE (locked to `answer-icons.png`).** Again, Hard, Good and Easy use refresh, ascending-bars, circled-check and double-chevron icons respectively. Each is a compact surface card with the label followed by its visible numeric shortcut and the scheduler-computed next interval (`1 • <1m`, for example). Neutral choices use muted icons; only the suggested or selected choice gets an orange icon and border. The controls are four-across from `sm` upward and 2×2 below it. Icons are decorative (`aria-hidden`); the complete visible text remains the button's accessible name, and the existing 1–4 keyboard behavior is unchanged.

**Card prompt typography — DESIGN RULE.** Every interaction front uses `CardPrompt`: 24px, bold, and centered within that interaction's prompt area. Type-specific or viewport-specific prompt sizes are not allowed. Only genuinely long authored prompts (more than 280 normalized characters or six non-empty lines) drop to 20px. That fallback is a readability safety net, not an authoring target: every v2 editor shows a non-blocking warning recommending that the author shorten or split the card. Recall additionally uses balanced top/middle/bottom rows so its prompt is geometrically centered between the type pill and flip cue.

---

## 9. Surfaces: canvas, cards, panels, rows

**DESIGN RULE.** Three levels, and rarely more on one screen:

1. **Canvas** (`--itera-canvas`) — the page ground. Set by `.itera-scope`; a page should not paint its own background.
2. **Surface** (`--itera-surface`) — cards, panels, popovers. One border (`--itera-border`), `--radius-itera-card`, shadow only when genuinely elevated.
3. **Subtle surface** (`--itera-surface-subtle`) — secondary fills inside a surface (search pills, inset areas). Not a third card layer.

**Cards and panels.** A panel earns its border by grouping something semantically. Section headings and spacing are the preferred grouping device; reach for a container second.

**Tables and lists — DESIGN RULE:** open rows separated by hairlines, **not** a bordered box per row, and not huge tiles. A row's hit target is the row itself; secondary actions live in a trailing overflow (kebab) menu rather than a rank of always-visible buttons.

**IMPLEMENTED:**

- Deck rows (`src/features/library/DeckRow.tsx`) show a restrained square deck mark, title, card count, last studied, a mastery rail and a due count, plus an overflow menu — as a **grid row**, keyboard-focusable with `focus-visible:ring-2 focus-visible:ring-itera-accent`.
- Card rows (`src/features/library/shared/CardTable.tsx`) render both v1 `Card` and v2 `CardV2Record` rows through one unified `RowMeta`, and clicking the row **opens the card in preview** rather than a detail page. Edit/Duplicate/Move/Suspend/Delete live in the row's kebab menu.
- Shared row furniture: `MasteryRing`, `MeterBar`, `Stat`, `DeckMark`, `EmptyState`, `StatusBadge`, `InteractionTypeBadge`, `OverflowMenu`.
- **Deck marks are restrained, never rainbow icon art.** A designed deck-cover system is **FUTURE**, not something to improvise per deck.

### Library's local sidebar

**DESIGN RULE.** Library is a **two-pane browser**: a Collection sidebar local to Library on the left, content on the right. Do not add a permanent third pane (sidebar + deck list + full deck page); that composition was tried and rejected as clunky and overly managerial. When a Deck opens, the deck **list** gives way to the deck page — the Collection navigation stays.

Sidebar styling: quiet text hierarchy, indentation and subtle branches, **no yellow folder art, no large colorful icons**, muted counts, selection shown as a pale tint plus a small orange focus marker (not a solid orange pill), and "Unfiled" near the bottom.

**IMPLEMENTED:** `LibraryShell.tsx` is a `grid-cols-[264px_1fr]`; `CollectionNav.tsx` drills all the way to individual decks (a small dot marks the active one via `activeDeckId`), and a `LibraryTip` aside fills the sidebar's own empty space below the tree. `CollectionNavDrawer.tsx` is the narrow-width drawer. Progress and Settings reuse the same local-sidebar idea with their own nav components.

---

## 10. Menus, popovers and the account menu

**DESIGN RULE.** Overlays float above the canvas with `--itera-shadow-float`, close on Escape and outside click, and never trap the user. A disabled destination is shown as a **focusable `aria-disabled` row with a "Soon" pill** — never a `disabled` control (unreachable by keyboard, invisible to screen readers) and never silently hidden. This is how the product states its intended IA without fabricating features.

**IMPLEMENTED:**

- `FloatingPanel.tsx` is the one popover primitive (§3): portaled, viewport-aware, flips above the anchor when it will not fit below, clamps 8px from every edge, re-places on scroll/resize. Opt into real menu keyboard semantics with `manageFocus`.
- `AccountMenu.tsx` / `AccountMenuContent.tsx` — the avatar popover: a 300px anchored `FloatingPanel` with `manageFocus` (focus enters the menu, arrows/Home/End walk it, Tab closes, Escape returns focus to the trigger), collapsing below 480px (`useIsNarrowShell`) into a bottom sheet with identical content. Live rows: **Account settings** and **Sign out** (live whenever any session exists — local, demo or Supabase). Preferences, Keyboard shortcuts, Help & documentation and About Itera are `aria-disabled` "Soon" rows.
- **The account menu is quick navigation only.** Do not grow it into a second settings sidebar; new settings belong in `src/features/settings/`.
- Portals sit outside `.itera-scope` and must re-apply the class plus cancel its canvas background (§3).

---

## 11. Motion — DESIGN RULE (locked)

The motion language is **quiet momentum**: motion implies forward progress without spectacle.

Use it for card transitions, restrained progress animation, the Recall flip, subtle selected-state changes, smooth reordering, and a calm completion transition. **Avoid** bounce-heavy easing, confetti, floating decorations, large spring animations, and any motion that makes the learner wait.

Timing guidance, with easing near `cubic-bezier(0.2, 0.8, 0.2, 1)`:

| Interaction | Duration |
|---|---|
| Hover / press | 100–160ms |
| Selection change | 140–200ms |
| Panel expand / collapse | 180–260ms |
| Recall flip | 320–420ms |
| Card-to-card transition | 180–280ms |
| Completion transition | 350–600ms |

**IMPLEMENTED:** the flip lives in `.itera-flip*` (`src/index.css`), the next-card entrance in `.itera-card-enter` / `-active` (a 0.5s transform + 0.35s opacity settle out of an off-stack pose), and the editor/preview width sync in `.card-editor-shell`.

**Two mechanics you must know before animating anything:**

1. **Reduced motion is honored in CSS, per effect.** `@media (prefers-reduced-motion: reduce)` blocks in `src/index.css` neutralize `.itera-flip-face`, `.itera-card-enter`, `.flip-face`, `.reveal-in`, `.preview-drawer`, `.preview-shell-row` and `.card-editor-shell`. **Any new animated class must add its own reduced-motion rule** — there is no blanket `*` override doing it for you. JS-driven motion checks `window.matchMedia('(prefers-reduced-motion: reduce)')` directly (`AccountMenu.tsx`, `SuggestedSessionHero.tsx`). Reduced motion must never gate *content*: reveal happens synchronously regardless of motion settings, and there is a test asserting exactly that.
2. **A CSS `transition` on a Tailwind-composed `transform` does not reliably animate.** `scale-*`/`rotate-*`/`translate-*` (including `group-hover:` variants) each write a separate custom property that a shared rule composes; transitioning the composed value was measured snapping instantly in Chromium despite a correct duration. Compute such transforms as **one literal `style.transform` string in JS**.

---

## 12. Accessibility — DESIGN RULE

- **WCAG AA** contrast for text and controls.
- **Visible focus rings.** The convention is `focus-visible:ring-2 focus-visible:ring-itera-accent` (with `ring-offset-2` on card-sized targets) or `focus-visible:outline-2 focus-visible:outline-itera-accent`. Never remove an outline without replacing it.
- **Every card interaction is keyboard-operable**, not drag-only.
- **No color-only correctness indicators** — pair color with a glyph, label or text.
- Screen-reader labels for card type and state; reduced-motion support (§11); touch targets ≥44×44px where practical.
- Shortcuts must **not** fire while focus is inside a text or code input.

Intended Review shortcuts: `Escape` exit/pause with confirmation, `Space` flip a Recall card, `Enter` submit an automatic interaction, `1/2/3/4` for Again/Hard/Good/Easy after feedback, arrows to walk MCQ options or ordering controls.

**IMPLEMENTED, and worth copying:**

- `reviewV2/components/FlipCard.tsx` is the accessible flip: real button semantics, `focus-visible` ring, `aria-pressed`, and `aria-hidden` on whichever face is turned away. **`src/components/ui/FlipCard.tsx` (v1) is a plain `<div onClick>` with no keyboard or ARIA support** — a known gap deliberately not fixed in place. Use the v2 one for new work.
- **Ordering** makes each complete row the pointer and keyboard drag target and shows a decorative 3×4 dot grip at its right edge. There are no separate arrow controls: focus a row, press Space to pick it up, use Arrow keys, then Space to drop. Positions are announced via `aria-live`.
- **Multiple Choice** option rows pair a circular check marker with a navy selected-row tint and `aria-checked`; the marker is decorative to assistive technology because the row already owns the checkbox/radio semantics.
- **Walkthrough** keeps card-wide Tip/Explanation panels and may also render a step-scoped panel inside the active step: the step tip is pre-answer only, while the step explanation appears after that step is submitted and remains visible when revisited. Code-backed Walkthrough cards use opacity-only entrance motion so CodeMirror glyphs are never scaled or rotated during rasterization.
- `FloatingPanel`'s `manageFocus` implements the menu keyboard contract; `dialogs.tsx` replaces the `window.*` builtins with focus-managed modals.
- **A gap to respect:** `happy-dom` has no visibility semantics, so component tests cannot catch focus or layout bugs — `focus()` on a hidden element silently succeeds there and fails in Chromium. Anything focus-, popover- or overflow-related must be verified in a real browser.

**FUTURE:** the Matching listbox/assignment fallback for screen readers and small screens, and a full sweep of the accessibility acceptance checklist, are specified but not done.

---

## 13. Responsive behavior

**DESIGN RULE.** Breakpoint bands: mobile `<768px`, tablet `768–1199px`, desktop `1200–1599px`, wide `≥1600px`.

| Surface | Rule |
|---|---|
| **Library** | Desktop: Collection sidebar + content. Tablet: collapsible sidebar. Mobile: Collection drill-down or drawer, deck page one column, metrics wrap, filters become a sheet or horizontal scroll. |
| **Review** | **One focused column at every width.** Card near full mobile width, code scrolls horizontally, Tip/Explanation stack below, rating controls become 2×2 or vertical. |
| **Create / Edit** | Desktop: editor + preview split. Mobile/tablet: Editor / Preview tabs. |
| **Matching** | Desktop: columns side by side. Mobile: **FUTURE** — select a source, then choose a target, showing completed pairs as stacked rows. |

**IMPLEMENTED:** breakpoints that Tailwind does not provide are `matchMedia` hooks, because the layouts they drive are real CSS Grid rather than utility classes — `useIsWideLibrary`, `useIsWideProgress`, `useIsWideEditor` (~980px), `useIsWideToday` (980px), `useIsNarrowShell` (480px). `CollectionNavDrawer` is Library's narrow-width answer; `AccountMenuContent` becomes a bottom sheet; the card editor becomes Editor/Preview tabs.

**Known gap:** Matching's mobile flow is only partly satisfied — a two-column card lays out side by side at 390px (verified live), but cards with three columns fall back to stacked flow rather than the stepwise pairing flow.

---

## 14. Visual references

The project is **mockup-driven**. Reference images are **not tracked in this repository** — there is no `docs/references/` directory, and inventing one would create paths that resolve to nothing. They live on the product owner's machine:

```
C:\Users\SK\Desktop\itera-mockups\
    webapp\        # product mockups cited by filename throughout itera-decisions.md:
                   #   login-v3.png, login-icons.png, profile.png, profile-menu.png, progress.png,
                   #   library.png, all-decks.png, library-use.png, add-new-card.png,
                   #   recall-card.png, recall-card-revealed.png, mcq-card.png,
                   #   ordering-card.png, matching-card.png, walkthrough-card.png,
                   #   write-code-card.png, optional-tip.png, ...
    inspo-icons\   # per-interaction icon references
    inspiration\   # general visual direction
    mobile\        # mobile-specific references
```

**How to treat a reference.** Every reference sits in one of three tiers, and the tier is stated in the decision entry that cites it — check [`itera-decisions.md`](itera-decisions.md) before implementing against any image:

| Tier | Meaning | How to use it |
|---|---|---|
| **LOCKED** | The approved target for that surface. Most `webapp/*.png` mockups cited by an implemented decision are locked. | Authoritative for **composition, hierarchy, spacing, density and typography**. Do not improvise a different layout. |
| **DIRECTION** | Approved feel, not an approved layout (much of `inspiration/`, `inspo-icons/`). | Borrow the mood, the icon weight, the density. Do not copy structure. |
| **CONCEPT** | Explored and not adopted, or superseded by a later image (e.g. earlier login variants). | Read for history only. Never implement from one. |

**Two standing exceptions apply to every locked mockup**, both already decided and not re-litigated per screen:

1. **Colors always come from the locked Itera token palette**, never from a mockup's own hues. This is why Progress's charts are navy/orange/success/warning rather than the mockup's blue/purple.
2. **A mockup element with no real data or backing feature is never fabricated.** It is either omitted outright (Billing, Plan & usage, the "Itera Pro" upsell) or rendered as a focusable `aria-disabled` row with a "Soon" pill.

Where a written brief and a locked mockup conflict, **say so and ask** — do not silently pick one.

**Verify visually.** Tests are not sufficient for UI work. Run the app and drive Chromium via the `playwright` devDependency (`npx playwright install chromium` once), check 1440×900 and 390×844, and exercise hover, keyboard focus and graded/revealed states — not just the resting state.
