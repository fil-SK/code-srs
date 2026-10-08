# Design system reference

The canonical FlipTap visual and interaction design system: brand rules, tokens, typography, spacing, shape, navigation, surfaces, motion, responsive behavior and accessibility. This is the practical answer to "how do I make a new piece of UI match" — whether that's a new icon, a new panel, or a new page.

**How to read the labels.** Design rules and shipped code are not the same thing, and this doc marks the difference wherever it matters:

- **DESIGN RULE** — a locked or settled rule that binds new work, whether or not every existing screen already follows it.
- **IMPLEMENTED** — what the code actually does today, including where it deliberately diverges from the rule above it.
- **FUTURE** — intended direction that nothing implements yet. Never build against these as though they exist.

This document owns *how it should look and behave*. It does not track *what is built* — that is [`CURRENT_STATE.md`](CURRENT_STATE.md) — or *why a call was made*, which is [`fliptap-decisions.md`](fliptap-decisions.md).

FlipTap’s palette supplies the product colors and re-points legacy semantic tokens so every web surface follows the same theme.

---

## 1. Theme tokens

**IMPLEMENTED (D469).** Web supports Light, Dark and System at `/settings/appearance`, also reachable from the account menu’s Preferences shortcut. The browser-local choice is saved automatically under the existing `code-srs-theme` key. Light is the default for new browsers and invalid or unavailable storage. System follows device appearance changes while the app is open. A head script restores the saved preference before styles paint; `ThemeProvider` owns the live preference and resolved theme, synchronizes browser tabs and updates browser chrome. Native and marketing retain their existing light presentation.

**One palette with legacy aliases.** `:root` and `.fliptap-scope` define the light `--fliptap-*` roles. `:root[data-theme=dark]` and dark scoped descendants override every color role. Root tokens also paint auth loading, the body and portals. `FlipTapSurface` paints the shared canvas without overriding the theme context. Native controls and scrollbars follow `color-scheme`.

`@theme inline` keeps utilities bound to runtime CSS variables. General names such as `--bg`, `--panel`, `--panel-2`, `--text`, `--muted`, `--faint`, `--border`, `--accent`, `--accent-soft`, `--green`, `--red`, `--amber`, `--shadow` and `--code-bg` re-point to the corresponding FlipTap roles. `--blue` maps to `accent-active`. Keep this compatibility seam so older components inherit the active palette.

| Token (`--fliptap-…`) | Light | Dark | Role |
|---|---|---|---|
| `navy` | `#1e293b` | `#1e293b` | `Fixed navy fills with white foregrounds` |
| `canvas` | `#f6f7f9` | `#0f1724` | `Page background` |
| `surface` | `#ffffff` | `#172131` | `Cards and panels` |
| `surface-subtle` | `#f9fafb` | `#1c293b` | `Secondary surfaces and code` |
| `ink` | `#172033` | `#e5ecf5` | `Primary text` |
| `ink-brand` | `#1e293b` | `#f1f5f9` | `Headings, values and neutral icons` |
| `muted` | `#64748b` | `#a8b7cb` | `Secondary copy` |
| `muted-light` | `#94a3b8` | `#8a9bb2` | `Tertiary copy` |
| `border` | `#e3e7ed` | `#2d3d52` | `Default border` |
| `border-strong` | `#cbd3de` | `#465a74` | `Emphasized border` |
| `accent` | `#ff6902` | `#ff6902` | `Locked orange signal` |
| `accent-hover` | `#ea5f00` | `#ea5f00` | `Hover state` |
| `accent-active` | `#d95700` | `#d95700` | `Active state` |
| `accent-soft` | `#fff2e8` | `#35261f` | `Orange tint` |
| `accent-softer` | `#fff8f3` | `#28221f` | `Quieter orange tint` |
| `navy-soft` | `#eef2f7` | `#223149` | `Neutral tint` |
| `selection-soft` | `#f2f6fc` | `#203149` | `Selection background` |
| `selection-border` | `#9cb4db` | `#6585b4` | `Selection border` |
| `success` | `#15803d` | `#4ade80` | `Success copy` |
| `success-solid` | `#15803d` | `#15803d` | Solid fill behind white feedback glyphs |
| `success-soft` | `#ecfdf3` | `#18382a` | `Success background` |
| `error` | `#c2413a` | `#fb8f86` | `Error copy` |
| `error-solid` | `#c2413a` | `#b93832` | Solid fill behind white danger labels/glyphs |
| `error-soft` | `#fef2f2` | `#3b252a` | `Error background` |
| `warning` | `#b45309` | `#fbbf24` | `Warning copy` |
| `warning-soft` | `#fff7ed` | `#392e1d` | `Warning background` |

The orange signal rule applies in both themes. Fixed navy fills use white copy; neutral foregrounds use `ink-brand` so they stay readable on dark surfaces. Chart tooltips keep fixed navy backgrounds and white copy. The Today hero and login card fan retain their locked geometry. Today's furthest-back card (#4) uses pale gray `#d9dee5` in light mode and dark gray `#374151` with a faint light border in dark mode (D470); it remains hidden below 640px.

**Shadows are platform-specific.** Light card: `0 12px 30px rgba(23,32,51,.08), 0 2px 6px rgba(23,32,51,.05)`; dark card: `0 12px 30px rgba(0,0,0,.2), 0 2px 6px rgba(0,0,0,.15)`. Light float: `0 18px 50px rgba(23,32,51,.12)`; dark float: `0 18px 50px rgba(0,0,0,.35)`.

**Shared identity stays in sync.** `packages/core/src/design/tokens.ts` exports `fliptapColors` (the native default) and `fliptapDarkColors` with the same complete role set. `apps/web/src/design/tokenDrift.test.ts` checks both CSS palettes in both directions, with exactly the two shadow values exempted, and verifies dark text/status contrast. The shared module also carries radii, font families/roles and shadow intent names. No stylesheet is generated and no layout mechanics or type/spacing scale belongs in core.

Radii: controls 9px, cards 14px, dialogs 16px, pills 999px. `rounded-card` aliases the 14px card radius. Fonts: self-hosted Inter Variable for non-code UI and JetBrains Mono Variable for code/shortcuts/technical metadata. `font-fliptap-display` is a compatibility alias to Inter.

**Code and motion.** `CodeView`/`CodeEditor` read the resolved theme for light or One Dark highlighting. CodeEditor reconfigures its theme compartment without resetting unsaved content, selection or undo history. Code backgrounds, caret and selection use semantic tokens. Appearance changes have no page animation, and existing color transitions respect reduced motion.
### Typography rules — DESIGN RULE (locked)

Two families, no more. **Do not add another family or mix decorative fonts.**

- **Inter** — all UI, body, headings, wordmarks, and expressive display text. Weight, size, tracking, and composition create hierarchy without a second sans-serif family.
- **JetBrains Mono** — code, keyboard shortcuts, and selected technical metadata. Nothing else.

**Login implementation:** `/login` inherits Inter Variable from `.fliptap-scope`, including its `Welcome back` and `Sign in` headings at weight 650. The family was finalized after a controlled comparison against Manrope and Plus Jakarta Sans; those temporary font faces and the selector were removed.

**App-wide implementation:** `.fliptap-scope` inherits Inter Variable by default. `/` therefore uses it for the greeting and large session-card count without page-specific font classes, while the shared navigation wordmark inherits it at the login wordmark's weight 650. `font-fliptap-display` also resolves to Inter, covering existing explicit display usages without a page-by-page cleanup dependency.

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

Top bars — **DESIGN RULE:** global nav 68–72px desktop; the immersive Review bar is an 80px full-width white strip at every width, following `recall-card.png`. "Full-width" means the available layout width, never `100vw`/`100dvw`, so a vertical scrollbar cannot create horizontal page overflow. Its background/border stay full-bleed, while its control grid uses the same centered 1280px frame as `TopNav`: Exit aligns with the FlipTap logo edge and the right hint aligns with the profile-control edge. Exit and the right-side action/status label share the same UI typography; only the keyboard keycap keeps its smaller semibold treatment. Deck flip-through may add bordered Prev/Next controls directly around the centered position; below `sm`, its redundant right shortcut hint hides so those controls never collide. The Exit button uses `cursor: pointer` across its complete text target. **IMPLEMENTED:** `TopNav` is a white `h-16` (64px) surface with a hairline bottom border, while `ReviewTopBar` is `min-h-20` (80px).

---

## 2. `FlipTapSurface`

`apps/web/src/features/reviewV2/components/FlipTapSurface.tsx`:

The wrapper supplies `.fliptap-scope` and follows the app-wide theme. The outermost
surface also owns `.fliptap-canvas` and one `CanvasWaves` decoration; nested
surfaces inherit that canvas and keep their backgrounds transparent. A local
React context identifies nesting, including the production Review wrapper and
editor live previews, without changing their content layout.

**Web canvas waves (D462, refined by D463-D467).** Three soft SVG curves rise
toward the upper right, echoed by a smaller mirrored drawing in the bottom
left. Both use `--fliptap-accent` at low opacity and fade into the canvas.
The decoration scrolls with the page, is static, hidden from assistive
technology and ignores pointer input. Only its own layer clips overflow;
content, card shadows, focus rings and portal menus retain their existing
behavior. Phone-width web layouts crop and scale the same curves. Native
mobile adoption is deferred. The reference is the background motif in
`C:\Users\SK\Desktop\itera-mockups\mobile\ChatGPT Image Aug 23, 2026, 09_56_29 PM.png`,
used as **DIRECTION** for this decoration only.

The current layer opacity is **0.8 on ordinary pages** and **0.55 on study
surfaces**, respectively 20% and 45% lower than the original D462 treatment.
The vertical gradient's middle stop is at 40% and reaches transparency at 90%,
so overlapping curves fade sooner near the bottom. `FlipTapSurface` accepts
`canvasTone="quiet"` for Review (loading, empty, active and complete), the
design previews and AppShell's card study/flip-through routes. Only the
outermost surface chooses the tone; nested surfaces inherit its single canvas.

The bottom-left drawing uses the same paths and gradient rotated 180 degrees,
at **85% of the upper drawing's opacity** (D465, increased from D464's 60%).
It is lifted 35px on desktop and 30px on phones from its original placement
to expose more of the curved edges. Its lighter curves create a diagonal
connection between the corners while leaving the center quiet. One clipped
decoration layer spans the full page: the upper drawing stays at the top and
the lower drawing follows the page's bottom, including scrolling pages. Each
drawing owns a unique gradient id. Phone layouts scale and crop both ends;
neither is fixed to the viewport.

A horizontal mask on the full-page decoration confines the visible color to
the sides (D466). It retains full intensity in the outer 12% on each side,
fades to 3% through the central 38%-62% of the page, and keeps the center
nearly neutral regardless of the individual drawings' width or rotation.
Progress's desktop sidebar shields navigation through its Settings footer
with `--fliptap-canvas`, matching the original page ground (D467). Library's
wave-exclusion behavior applies without changing Progress to a white panel.
The navigation panel at phone widths follows the active surface color.

Used by `AppShell` (whole app), `ReviewPage`/`ReviewSessionV2`, `LoginPage`, `RouteError` and `PreviewShell` (design-preview) — one shared mechanism, not separate "real" vs. "preview" copies. **Any new top-level surface that should render in the FlipTap visual system needs to be wrapped in `FlipTapSurface`** (or already be a descendant of one of the above).

`ForceLightTheme` was removed in D469. The scoped CSS palette and code highlighting now follow the same app-wide resolved theme, including nested editor previews. No surface overrides it locally.

---

## 3. Shared UI components (`apps/web/src/components/ui/`)

| Component | Purpose | Variants/props |
|---|---|---|
| `Button.tsx` | Base button | `variant?: 'primary' \| 'secondary' \| 'ghost' \| 'danger'` (default `secondary`). `primary`: `bg-accent text-white hover:brightness-110`. `secondary`: `border border-border bg-panel-2 hover:border-accent`. `ghost`: `text-muted hover:bg-panel`. `danger`: `bg-fliptap-error-solid text-white hover:brightness-110`, using a dedicated fill so white labels remain readable in both themes. Base radius `rounded-[9px]`, disabled → `opacity-50 pointer-events-none`. Props are `ComponentPropsWithRef<'button'>`, so `ref` passes through (React 19 ref-as-prop). |
| `Field.tsx` | Labeled form field + shared input classes | Exports `fieldClass`/`selectClass` strings (`rounded-[9px] border border-border bg-code-bg ... focus:border-accent`) used across every card-type editor. `<Field label>` renders an uppercase, tracked-out `text-xs font-semibold text-muted` caption above its children. |
| `FloatingPanel.tsx` | Portaled, viewport-aware popover panel anchored to a trigger | `anchor: HTMLElement \| null`, `onClose`, `align?: 'start' \| 'end'` (default `end`), `className?`, `role?`, `ariaLabel?`, `manageFocus?`, `returnFocusTo?`. Positions itself `fixed` against the anchor's rect, flips **above** the anchor when it would not fit below, clamps to 8px from every viewport edge, re-places on scroll (capture) / resize, and closes on outside `mousedown` or Escape. `manageFocus` (default **off**, so the pointer-driven row kebab menus are unchanged) adds real menu keyboard semantics: focus moves to the first non-`aria-disabled` `role="menuitem"` once the panel has been *measured* (focusing it earlier is a silent no-op — the panel is `visibility: hidden` until then), Arrow/Home/End walk the items with wrapping, Tab closes, and on unmount focus returns to `returnFocusTo` unless the user has already moved it elsewhere. |
| `dialogs.tsx` | In-app replacements for `window.confirm` / `window.prompt` / `window.alert` | `<DialogProvider>` (mounted in `apps/web/src/app/providers.tsx`) + `useDialogs()` → `{ confirm, prompt, alert }`, all promise-based so call sites read like the blocking builtins: `if (await dialogs.confirm({ title, description, danger }))`. `prompt` resolves the trimmed value or `null`; its submit button is disabled while empty. Rendered as a portaled modal with a `rgba(23,32,51,0.45)` scrim, `rounded-fliptap-dialog` surface, Escape/scrim-click to dismiss. **Focus is contained and returned:** on open it moves to the prompt input, else the confirm button — except a `danger` confirm, which opens on **Cancel** so Enter on an unexpected delete dialog dismisses rather than deletes. Tab/Shift+Tab wrap within the dialog's own controls and pull focus back in if it has escaped, handled on a `document` keydown (the same listener that owns Escape) so containment holds even when focus is already behind the modal. On close, focus returns to whatever was focused when the dialog opened, when that element is still connected and the user has not moved focus themselves — the same two-part guard `FloatingPanel` uses. |

Both `FloatingPanel` and `dialogs` portal into `document.body`, which sits **outside** `.fliptap-scope` — so each portal re-applies the `fliptap-scope` class on its own root and cancels that class's canvas `background` with an inline `background: transparent` (an overlay must not paint the page ground). Any future portal has to do the same or its `fliptap-*` tokens resolve to nothing.

`apps/web/src/lib/cn.ts` — `cn(...inputs) = twMerge(clsx(inputs))`. Standard clsx (resolves conditional/falsy args) + tailwind-merge (resolves conflicting Tailwind classes on the same CSS property, so a trailing `className` prop can safely override earlier classes) combo. Use this for all conditional/merged class strings.

`apps/web/src/lib/id.ts` — `newId()`. The one ID convention for every entity in the app: an RFC 4122 v4 UUID, from `crypto.randomUUID()` where it exists and otherwise assembled from `crypto.getRandomValues()`. `randomUUID` is **secure-context only**, so a plain-HTTP LAN dev origin (physical-phone testing) has no such method; `getRandomValues` carries no such restriction, so both branches produce the same format from the same CSPRNG. Never generate an id any other way.

---

## 4. Icon conventions

**Reviewed identities (D472)** use `packages/core/src/design/approvedIcons.ts`'s
shared drawing data through the web and native SVG renderers. The approved set is
Streak, Retention, Calendar, Study Time, Library, Review, Progress, Profile and
all six card interactions; Today keeps the existing brand symbol. Recall is the
original web Brain, and Multiple Choice is the original native list-checks glyph.
Custom shapes retain their reviewed stroke widths, rounded forms and subtle fills.
The retention target preserves the native font's full outline and baseline; the
clock has a whole-face tint with no sector. Do not replace these with approximate
library equivalents or recolor them per item. Metrics use the approved orange
streak, green retention, blue calendar and purple time accents on readable
surfaces. Navigation inherits the existing selected/neutral roles; card tiles
keep their existing type colors. Use a readable pale clock on the navy Today hero.

Ordinary unreviewed web UI icons still come from **`lucide-react`**, and native
utility icons retain MaterialCommunityIcons. Deck icons are explicitly deferred
from this redesign and keep D468's current treatment. Text-only web top links
remain text-only, the Today brand mark and account initials remain intact, and
no new navigation destination is introduced. The hero bracket motif and
logo-derived watermark remain illustration exceptions (see §6).

The two selected MaterialCommunityIcons outlines carry their Apache-2.0 source
notice in `ICON-LICENSES.txt` and web's offline-available third-party notices.
Lucide's existing ISC/Feather notices are retained.

**The circular badge pattern** (`apps/web/src/features/today/MomentumPanel.tsx`), the most common treatment for a labeled icon in a list row:

```tsx
<div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-fliptap-accent-soft text-fliptap-accent">
  <Icon size={15} />
</div>
```

A 32px soft circle for compact grouped metrics. Streak and milestone keep orange; approved Retention and Calendar use green and blue glyphs with matching subtle fills. All drawings inherit `currentColor`, so their surrounding surface controls the tone.

Other conventions seen across `apps/web/src/features/today/*.tsx`:
- **Sizes**: 14–17px for ordinary inline/list icons and 15px for most nav/action chrome. The branded streak flame is 24px in the top nav, and Progress KPI badges use 17px glyphs inside 36px circles because those are compact data-visualization marks rather than inline controls.
- **Inline chrome icons** (nav search, "Create" button) sit at `gap-1.5`–`gap-2` next to text, not inside a circular badge — badges are reserved for list-row icons, not nav/action chrome.
- **Trailing affordance**: `ChevronRight` at 14–16px, colored `text-fliptap-muted` (decorative) or `text-fliptap-accent` (a clickable "Continue"/"View more" link).
- **Deck identity (D468)**: `DeckMark.tsx` renders a chosen generic Lucide glyph in a square `rounded-fliptap-control` navy tile, with white line art at stroke width 1.75. The same component serves Library rows/headers, Today and Progress. Small/medium/collection/large marks preserve their 36/44/80/148px footprint, with 18/22/40/64px glyphs; Today's existing 40px footprint remains. Deck names carry the accessible identity, so the accompanying marks are decorative. Existing decks without `iconId` show Code without a data rewrite. This supersedes web's generated monogram and diagonal ribbon; native still has its existing presentation.

**Deck icon chooser.** `DeckIconPicker.tsx` offers 48 generic development concepts in Code, Data, Systems and Workflow categories, with label/keyword search, visible selected state and native buttons for keyboard navigation. Company logos, remote assets and per-deck rainbow colors are excluded. It expands inline in Deck/Collection settings and in `DeckCreateDialog.tsx`, whose name-and-icon form follows the existing centered-modal / below-480px bottom-sheet convention with focus containment, Escape/scrim dismissal and focus return. Choosing a glyph previews it; Create or Save persists it, and Cancel discards it. Long lists scroll inside the chooser. A full designed deck-cover system remains future work.

**The orange-usage rule (locked, spec §4.4):** orange is a *signal*, not theme paint. Reserved for: primary actions, the active-nav marker, the current important metric, session-progress accents, small branded focus details. **Not** meant to color every icon/progress-bar/tag/row simultaneously. Rule of thumb: **one primary orange action + at most two or three minor orange accents per screen.** (This is why the sidebar's active-item treatment is a left accent bar + light tint, not a solid orange pill — see `fliptap-decisions.md` D48.) When adding a new icon, default to `text-fliptap-muted` or `text-fliptap-ink-brand` unless it's genuinely one of the few orange-worthy elements on that screen.

**Owner-approved canvas exception (D462, 2026-10-05):** the faint background
waves in §2 are decorative atmosphere rather than an action or status signal.
They do not change the accent budget for controls, icons, rows or progress bars.

---

## 5. Markdown / RichText

**The syntax is shared; the rendering is not.** What `**bold**`, `*italic*`, `` `code` `` and a fenced block *mean* is decided once, in `packages/core/src/content/parseRichText.ts`, which turns a card's text into a closed union of semantic nodes (`paragraph`/`code`, and `text`/`strong`/`em`/`inlineCode` inside them). `apps/web/src/components/text/RichText.tsx` is the **web renderer** over that tree: it maps nodes onto DOM elements and parses nothing. A future native renderer maps the same tree onto its own elements, so the two platforms cannot end up with two interpretations of the syntax.

A deliberately small, custom markdown subset — not a full parser, no `dangerouslySetInnerHTML` (nodes are built as real React elements, XSS-safe by construction). Supported syntax:

- Fenced code blocks: ` ```lang\n...\n``` ` → rendered via `LazyCodeView` (real CodeMirror), default language `text`.
- Inline code: `` `code` `` → `<code>` styled `rounded-[5px] bg-panel-2 px-1.5 py-0.5 font-mono text-[0.875em] text-accent`.
- **Bold**: `**text**`, *italic*: `*text*` (bold matched first so `**` wins over `*`).
- Plain paragraphs render in a `whitespace-pre-wrap` div.

Two entry points: `RichText` (block-level — handles fences + text) and `InlineText` (inline-only, for short labels like MCQ options, no wrapping element).

**Underscores are never emphasis markers** — the regex only matches `*`/`**`, never `_`/`__`. This is deliberate: flashcard content is often code-adjacent, so `snake_case_identifiers` render literally instead of being mangled by an underscore-based emphasis rule. Do not pull in a markdown library that would reintroduce this. `packages/core/src/content/parseRichText.test.ts` locks this rule, along with inline-code-beats-emphasis and bold-beats-italic — the three a native re-implementation is most likely to get wrong.

**Card content is data, never markup.** Every node carries plain strings and (for a fenced block) a language id; there is no `html`, `raw` or `url` node, so no renderer is ever handed something to execute or navigate to. Nothing is escaped or stripped on the way in either — `<`, `>`, `&`, generics like `Vec<T>` and whole HTML examples are legitimate flashcard content and survive byte for byte. Safety is the *shape* of the tree plus each renderer's refusal to use a raw-HTML sink, never input mutation. `apps/web/src/components/text/renderingSinks.test.ts` scans every production module in `apps/web/src/` and fails on `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `DOMParser`, `eval(` or `new Function(`; the malicious-content regression suites are `apps/web/src/components/text/RichText.test.tsx`, `apps/web/src/features/reviewV2/contentSecurity.test.tsx` and `apps/web/src/data/importedContentSecurity.test.ts`.

**Screen-reader flattening** (`stripInlineMarkers`, also in `packages/core/src/content/`) strips `` ` `` and `*` for accessible names, so an announcer reads the words rather than spelling out the markers. It is deliberately marker-blind rather than parse-derived — see the module comment.

**One image field, one URL rule.** `WalkthroughInteraction.image` is the only card field that becomes a URL the app loads, and `isSafeImageSource` (`packages/core/src/content/imageSource.ts`) accepts only base64 `data:` URLs of type PNG, JPEG, GIF, WebP or AVIF — exactly what the authoring file picker produces. SVG is excluded on purpose. The same predicate gates the file picker, backup validation and the Review renderer, so no layer can accept what another would refuse.

---

## 6. Code display (`apps/web/src/components/code/`)

`CodeView.tsx` — a read-only CodeMirror 6 view: line numbers, non-editable, line wrapping, transparent background (so the wrapping container's `--code-bg` shows through), JetBrains Mono at 13px. Syntax palette is chosen from live `useTheme()` (`oneDarkHighlightStyle` vs `defaultHighlightStyle`) and matches the active CSS palette.

`highlightLines?: number[]` (1-based) tints specific lines via a custom read-only `StateField`, styled as `background: var(--accent-soft)` + `box-shadow: inset 3px 0 0 0 var(--accent)` (tinted background + left accent bar) — used for a walkthrough step's "focus here" range. The array comes from `apps/web/src/features/reviewV2/interactions/walkthrough/focusLines.ts`'s `focusToHighlightLines`, which expands a step's authored `focus` ranges (`Array<{startLine, endLine}>`). The old `apps/web/src/components/code/lineRanges.ts` (`parseLineRanges`, which parsed a typed string like `"26-34, 40, 42-45"`) was deleted with the v1 surface and has no successor: focus ranges are structured card data now, not a string a person types.

`LazyCodeView`/`LazyCodeEditor` are `React.lazy()` wrappers (via `apps/web/src/lib/lazyWithRetry.ts`'s `importWithReload`) around `CodeView`/`CodeEditor` — CodeMirror plus language grammars are heavy, kept out of the initial bundle, loaded on first actual use. `importWithReload` also recovers from a stale/missing chunk after a deploy (reloads once). Both CodeMirror surfaces use the self-hosted `JetBrains Mono Variable` family first and request a fresh geometry measurement after `document.fonts.ready`, preventing fallback-font wrapping from persisting until a scroll or edit.

---

## 7. Shape and logo usage rules — DESIGN RULE (locked)

The shape language is **structured softness**.

- **Don't round every object equally.** Radius is a signal that something is an interactive or semantic object. Code surfaces stay more rectangular than cards; pills are reserved for true pills, tags and small labels.
- **Don't nest decorative containers.** A code block inside a flashcard is fine. A metric card inside a stat card inside a dashboard panel is not. If you are on your third border, delete two of them.
- **Tables and lists use open rows + separators**, not one bordered container per row.
- **Shadows are sparing.** A main Review card may carry `--fliptap-shadow-card`; most Library rows carry none. `--fliptap-shadow-float` is for genuinely floating elements (popovers, sheets, dialogs).

**The logo / stacked-card motif is locked to sanctioned spots:** main navigation, onboarding and launch, the Today session hero, and completion or branded transition moments. It is explicitly **forbidden** as general decoration — not on every deck cover, not behind every card, never inside Review content, never as repeated filler. The failure mode named in the brand rules is *"look, here are more stacked cards because the logo has stacked cards."* The motif appears only where it carries meaning.

**IMPLEMENTED:** `SuggestedSessionHero.tsx`'s 4-layer stacked treatment is the one sanctioned reuse of the motif outside the logo itself, and its own file comments say so. Do not lift that pattern into new components. `apps/web/src/features/reviewV2/ReviewSessionScreen.tsx`'s `.fliptap-card-enter` next-card entrance is a second, narrower echo of it (the incoming card settles out of an off-stack rotated pose) and is likewise not a general-purpose animation.

---

## 8. Navigation

**WEB DESIGN RULE (locked IA).** One calm horizontal top navigation. Logo left, primary destinations centered-left, account at far right. No permanent dark header, no global left sidebar, and no desktop navigation mechanically squeezed into mobile. The active web destination gets a **thin orange marker**, not a filled orange pill.

**IMPLEMENTED** (`apps/web/src/components/layout/`):

- `TopNav.tsx` is presentational only: logo, primary links, and a `rightSlot`. Its wordmark uses the same Inter Variable/650 treatment as login. It holds no product logic and no per-route title slot.
- `primaryNavLinks.ts` is the single source of truth for the primary destinations, and there are exactly three: **Today (`/`) · Library (`/decks`) · Progress (`/progress`)**.
- The right side holds `StreakBadge` + `AccountMenu`. Nothing else.
- **There is deliberately no global Search and no global `+ Create`.** The original locked IA included both; they were removed as a product call because each is a *scoped* concept — you search within a Library, you create a card within a deck — and a global affordance with no context to act on is worse than none. `CreateMenu.tsx` and `TopNav`'s search control were **deleted, not hidden**. Do not reintroduce either without a decision entry.
- Settings is reached through the account menu, never as a top-level destination. That part of the locked IA holds.
- **Local (page-level) sidebars are the convention for section navigation**, and they are what replaced the deleted global sidebar: `LibraryShell`/`CollectionNav`, `ProgressShell`/`ProgressNav`, `SettingsNav`.

**MOBILE IMPLEMENTED, DEVICE REVIEW PENDING:** `apps/mobile` has its separately-designed native shell, not a responsive copy of `TopNav`. Ordinary app sections use a persistent five-item bottom bar in the exact order **Library · Review · Today · Progress · Profile**. Today is the raised center control, carrying the FlipTap symbol on a light surface with a restrained orange selected treatment; every tab keeps a visible label and normal accessible tab semantics. Review in this bar is an entry point only: the interaction previews it opens are nested routes outside the tab group, so the bar disappears while recall is in progress, and Notifications behaves the same way. Every tab destination now has its own separately approved design, so none of them is a neutral placeholder any more.

Primary mobile tab pages place `MobileHeader` inside the same horizontally padded
scrolling frame as their page content. Their page titles use the prominent tab
title treatment (34px on Review and Progress); a header mounted outside that
frame visibly misaligns the brand and bell against the page below it.

Mobile notification rows separate navigation from state. The main row opens its
destination; a trailing status control with a minimum 44-point target marks the
item Read or Unread without navigating. A read row is a light neutral surface
using the locked palette, never a translucent gray wash over the whole card;
status is communicated by the surface, muted copy, icon treatment and explicit
Read badge together rather than by making the content look disabled.

### The Review-shell exception — DESIGN RULE (locked)

**Review renders none of the above.** It is immersive by construction: a full-width white top strip carrying only a literal **< Exit session** control (not an arrow icon), a bold position ("7 of 23") and a right-aligned shortcut whose key is drawn as a bordered `<kbd>`, then the narrow card column, tip, explanation and rating controls on open space. The same strip renders on the real study-preview routes; those routes receive a full-width, zero-top-padding `AppShell` main so the strip stays full-bleed and sits flush beneath `TopNav`. Deck flip-through is the one additive variant: Prev and Next flank the position in the strip and advertise `ArrowLeft`/`ArrowRight` through `aria-keyshortcuts`; the page listener ignores held keys and events originating in interactive card controls/editors. The strip's inner controls share the nav's centered 1280px frame. Session-backed surfaces use a symmetric 56px vertical frame: 56px from the strip to the card and 56px from the final rendered content (normally rating controls) to the surface bottom. Editor live previews deliberately keep their Question/Answer toggle instead because they have no deck/session position. Revealed preview-only cards say **Answer revealed**; when ratings are present, the hint becomes **Rate your answer** without repeating the numeric shortcuts already visible on the buttons.

Never add to Review: global navigation, the FlipTap logo, a left sidebar, the upcoming queue, a card-information panel, a session-statistics panel, an explanation of spaced repetition, or persistent deck metadata. Those were tested and rejected because they distract from recall.

**IMPLEMENTED:** `/review` is a **structurally separate top-level route with no `AppShell` ancestor** (`apps/web/src/app/router.tsx`), so it is chrome-free by construction rather than by hiding the shell with CSS. `/login` and `/design-preview/*` use the same pattern. `ReviewTopBar.tsx` carries exit + counter + shortcut hint and nothing else. Because `AccountMenu` mounts from `AppShell`, Review has no account menu automatically.

**Rating controls — DESIGN RULE (locked to `answer-icons.png`).** Again, Hard, Good and Easy use refresh, ascending-bars, circled-check and double-chevron icons respectively. Each is a compact surface card with the label followed by its visible numeric shortcut and the scheduler-computed next interval (`1 • <1m`, for example). Neutral choices use muted icons; only the suggested or selected choice gets an orange icon and border. The controls are four-across from `sm` upward and 2×2 below it. Icons are decorative (`aria-hidden`); the complete visible text remains the button's accessible name, and the existing 1–4 keyboard behavior is unchanged.

**Card prompt typography — DESIGN RULE.** Every interaction front uses `CardPrompt`: 24px, bold, and centered within that interaction's prompt area. Type-specific or viewport-specific prompt sizes are not allowed. Only genuinely long authored prompts (more than 280 normalized characters or six non-empty lines) drop to 20px. That fallback is a readability safety net, not an authoring target: every v2 editor shows a non-blocking warning recommending that the author shorten or split the card. Recall additionally uses balanced top/middle/bottom rows so its prompt is geometrically centered between the type pill and flip cue.

---

## 9. Surfaces: canvas, cards, panels, rows

**DESIGN RULE.** Three levels, and rarely more on one screen:

1. **Canvas** (`--fliptap-canvas`) — the page ground, with one shared faint orange wave decoration on web (§2). Set by `FlipTapSurface`; a page should not paint its own background.
2. **Surface** (`--fliptap-surface`) — cards, panels, popovers. One border (`--fliptap-border`), `--radius-fliptap-card`, shadow only when genuinely elevated.
3. **Subtle surface** (`--fliptap-surface-subtle`) — secondary fills inside a surface (search pills, inset areas). Not a third card layer.

**Cards and panels.** A panel earns its border by grouping something semantically. Section headings and spacing are the preferred grouping device; reach for a container second.

**Tables and lists — DESIGN RULE:** open rows separated by hairlines, **not** a bordered box per row, and not huge tiles. A row's hit target is the row itself; secondary actions live in a trailing overflow (kebab) menu rather than a rank of always-visible buttons.

**IMPLEMENTED:**

- Deck rows (`apps/web/src/features/library/DeckRow.tsx`) show a restrained square deck mark, title, card count, last studied, a mastery rail and a due count, plus an overflow menu — as a **grid row**, keyboard-focusable with `focus-visible:ring-2 focus-visible:ring-fliptap-accent`.
- Card rows (`apps/web/src/features/library/shared/CardTable.tsx`) render every card through one `RowMeta` projection, and clicking the row **opens the card in study preview** rather than a detail page. Edit/Duplicate/Move/Suspend/Delete live in the row's kebab menu.
- Shared row furniture: `MasteryRing`, `MeterBar`, `Stat`, `DeckMark`, `EmptyState`, `StatusBadge`, `OverflowMenu`.
- **Deck marks are restrained, never rainbow icon art.** D468 implements chosen generic line icons in the one navy treatment. A full designed deck-cover system is **FUTURE**, not something to improvise per deck.

### Library's local sidebar

**DESIGN RULE.** Library is a **two-pane browser**: a Collection sidebar local to Library on the left, content on the right. Do not add a permanent third pane (sidebar + deck list + full deck page); that composition was tried and rejected as clunky and overly managerial. When a Deck opens, the deck **list** gives way to the deck page — the Collection navigation stays.

Sidebar styling: quiet text hierarchy, indentation and subtle branches, **no yellow folder art, no large colorful icons**, muted counts, selection shown as a pale tint plus a small orange focus marker (not a solid orange pill), and "Unfiled" near the bottom.

**IMPLEMENTED:** `LibraryShell.tsx` is a centered, bordered white `grid-cols-[252px_1fr]` surface. `CollectionNav.tsx` drills all the way to individual decks (a small dot marks the active one via `activeDeckId`), rolls its counts up as cards rather than deck nodes, and pins Settings to the bottom. Branches are visible hairlines; Collection chevrons sit after the label like the locked reference. `CollectionNavDrawer.tsx` is the narrow-width drawer. The default **All Decks** content mirrors `all-decks.png`: title/description/action header over a hairline, orange New Deck signal action, a 376px × 44px search field, 136px filter and 192px sort controls, descriptive rows with restrained 44px marks and bold values, and ten-deck pages. Multi-page footers state `Showing X-Y of Z decks/cards`. That All Decks identity is scope-specific and must not leak into Unfiled or Collection views. The focused Deck page uses seven-row pagination at all times, keeping v1 drag ordering within the visible page, and stacks its identity/actions cleanly at phone widths. Progress and Settings reuse the same local-sidebar idea with their own nav components.

---

## 10. Menus, popovers and the account menu

**DESIGN RULE.** Overlays float above the canvas with `--fliptap-shadow-float`, close on Escape and outside click, and never trap the user. A disabled destination is shown as a **focusable `aria-disabled` row with a "Soon" pill** — never a `disabled` control (unreachable by keyboard, invisible to screen readers) and never silently hidden. This is how the product states its intended IA without fabricating features.

**IMPLEMENTED:**

- `FloatingPanel.tsx` is the one popover primitive (§3): portaled, viewport-aware, flips above the anchor when it will not fit below, clamps 8px from every edge, re-places on scroll/resize. Opt into real menu keyboard semantics with `manageFocus`.
- `AccountMenu.tsx` / `AccountMenuContent.tsx` — the avatar popover: a 300px anchored, viewport-height-capped `FloatingPanel` with `manageFocus` (focus enters the menu, arrows/Home/End walk it, Tab closes, Escape returns focus to the trigger), collapsing below 480px (`useIsNarrowShell`) into a bottom sheet with identical content. Its divider groups follow `profile-menu.png`: Account settings + Preferences; Study settings + Spaced repetition (FSRS) + Import / Export; Keyboard shortcuts + Help; What's new + About FlipTap; Sign out. **Account settings, Preferences (Appearance), Import / Export, About FlipTap and Sign out are live**; every unbuilt destination, Spaced repetition (FSRS) included, stays an `aria-disabled` "Soon" row. Its header block carries the session's real identity — the email, or "Demo workspace" for the demo session — over a line saying where the data lives; there is no profile record, so it shows no display name.
- `AdjustSessionDialog.tsx` (`apps/web/src/features/today/`) — **the settled treatment for a small form overlay**, and the pattern to copy for the next one. `useDialogs()` only covers confirm/prompt/alert, and `FloatingPanel` carries `role="menu"` semantics, so neither fits a form with validation. It is a `role="dialog" aria-modal="true"` portal that mirrors `DialogHost`'s structure — `rgba(23,32,51,0.45)` scrim, `rounded-fliptap-dialog` surface, Escape and scrim-click to dismiss, focus into the first control on open, focus returned to the trigger on close — as a **centered modal on desktop and a bottom sheet below 480px** (`useIsNarrowShell`), exactly the split `AccountMenu` established. Content stays lightweight: a radio scope group, segmented `aria-pressed` size presets, one conditional number field, and a `role="status"` line that always states what Start will actually do. **The summary never advertises a count the Start button will not honor** — an unusable custom value asks for a number instead of silently falling back to the whole queue.
- **The account menu is quick navigation only.** The requested study/backup shortcuts are the exception that proves the rule; do not mirror the full settings sidebar. New settings belong in `apps/web/src/features/settings/`.
- Portals sit outside `.fliptap-scope` and must re-apply the class plus cancel its canvas background (§3).

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

**IMPLEMENTED:** the flip lives in `.fliptap-flip*` (`apps/web/src/index.css`), the next-card entrance in `.fliptap-card-enter` / `-active` (a 0.5s transform + 0.35s opacity settle out of an off-stack pose), the Today hero's mount-in stacking reveal in `SuggestedSessionHero.tsx` (four layers dropping onto the pile back-to-front, 460ms each on a 110ms stagger; D170), and the editor/preview width sync in `.card-editor-shell`.

**IMPLEMENTED (the review loop's own motion, D454/D456).** The **reveal** is one step, not a cascade: the feedback banner, explanation panel and rating controls arrive together on `.reveal-in` (250ms), while `ReviewSessionScreen` animates the card's own height across the presenting-to-revealed transition (320ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`, skipped below an 8px delta) so the panels underneath travel instead of jumping. The **completion transition** is `.fliptap-complete-in` / `-delayed` (420ms on the same easing, with a 120ms second step for the summary's numbers) - the slow end of the Completion row above, and the only sanctioned decorative use of the layered-card mark outside the logo, nav and Today hero.

**IMPLEMENTED (loading, D455).** One convention, not a per-route decision: **the page frame always renders and only its data regions become placeholders.** Headings, local sidebars, toolbars, the page grid and the Review strip paint immediately; `Skeleton` / `LoadingRegion` (`apps/web/src/components/ui/Skeleton.tsx`) fill the data regions with a 1.6s opacity pulse and its own reduced-motion rule. A route must never replace itself with a loading word, must never render a false empty state before its query resolves, and must never render nothing. `LoadingRegion` carries `aria-busy` plus one visually hidden `role="status"` sentence, so a region is announced once rather than once per placeholder. This changes only what is painted during a block, never whether a surface blocks: a page that refuses to render against half-loaded data still refuses.

**Two mechanics you must know before animating anything:**

1. **Reduced motion is honored in CSS, per effect.** `@media (prefers-reduced-motion: reduce)` blocks in `apps/web/src/index.css` neutralize `.fliptap-flip-face`, `.fliptap-card-enter`, `.flip-face`, `.reveal-in`, `.preview-drawer`, `.preview-shell-row` and `.card-editor-shell`. **Any new animated class must add its own reduced-motion rule** — there is no blanket `*` override doing it for you. JS-driven motion checks `window.matchMedia('(prefers-reduced-motion: reduce)')` directly (`AccountMenu.tsx`, `SuggestedSessionHero.tsx`). Reduced motion must never gate *content*: reveal happens synchronously regardless of motion settings, and there is a test asserting exactly that.
2. **A CSS `transition` on a Tailwind-composed `transform` does not reliably animate.** `scale-*`/`rotate-*`/`translate-*` (including `group-hover:` variants) each write a separate custom property that a shared rule composes; transitioning the composed value was measured snapping instantly in Chromium despite a correct duration. Compute such transforms as **one literal `style.transform` string in JS**.

---

## 12. Accessibility — DESIGN RULE

- **WCAG AA** contrast for text and controls.
- **Visible focus rings.** The convention is `focus-visible:ring-2 focus-visible:ring-fliptap-accent` (with `ring-offset-2` on card-sized targets) or `focus-visible:outline-2 focus-visible:outline-fliptap-accent`. Never remove an outline without replacing it.
- **Every card interaction is keyboard-operable**, not drag-only.
- **No color-only correctness indicators** — pair color with a glyph, label or text.
- Screen-reader labels for card type and state; reduced-motion support (§11); touch targets ≥44×44px where practical.
- Shortcuts must **not** fire while focus is inside a text or code input.

Intended Review shortcuts: `Escape` exit/pause with confirmation, `Space` flip a Recall card, `Enter` submit an automatic interaction, `1/2/3/4` for Again/Hard/Good/Easy after feedback, arrows to walk MCQ options or ordering controls.

**IMPLEMENTED, and worth copying:**

- `reviewV2/components/FlipCard.tsx` is **the** flip primitive and the only one: real button semantics, `focus-visible` ring, `aria-pressed`, and `aria-hidden` on whichever face is turned away. It replaced an earlier `apps/web/src/components/ui/FlipCard.tsx` that was a plain `<div onClick>` with no keyboard or ARIA support; that file and its `.flip*` CSS have been deleted.
- **Ordering** makes each complete row the pointer and keyboard drag target and shows a decorative 3×4 dot grip at its right edge. There are no separate arrow controls: focus a row, press Space to pick it up, use Arrow keys, then Space to drop. Positions are announced via `aria-live`.
- **Multiple Choice** option rows pair a circular check marker with a navy selected-row tint and `aria-checked`; the marker is decorative to assistive technology because the row already owns the checkbox/radio semantics.
- **Walkthrough** keeps card-wide Tip/Explanation panels and may also render a step-scoped panel inside the active step: the step tip is pre-answer only, while the step explanation appears after that step is submitted and remains visible when revisited. Code-backed Walkthrough cards use opacity-only entrance motion so CodeMirror glyphs are never scaled or rotated during rasterization.
- `FloatingPanel`'s `manageFocus` implements the menu keyboard contract; `dialogs.tsx` replaces the `window.*` builtins with **focus-trapped** modals: focus in on open, Tab/Shift+Tab contained, focus back to the opener on close, and a destructive confirm opening on Cancel rather than on the red action (§3). **Known gap:** a dialog opened from a row kebab menu has no opener to return to, because those `FloatingPanel`s deliberately run without `manageFocus`, so focus is already on `document.body` by the time the dialog mounts. Recorded in [`TODO.md`](TODO.md); the dialog itself is correct.
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
C:\Users\SK\Desktop\fliptap-mockups\
    webapp\        # product mockups cited by filename throughout fliptap-decisions.md:
                   #   login-v3.png, login-icons.png, profile.png, profile-menu.png, progress.png,
                   #   library.png, all-decks.png, library-use.png, add-new-card.png,
                   #   recall-card.png, recall-card-revealed.png, mcq-card.png,
                   #   ordering-card.png, matching-card.png, walkthrough-card.png,
                   #   write-code-card.png, optional-tip.png, ...
    inspo-icons\   # per-interaction icon references
    inspiration\   # general visual direction
    mobile\        # mobile-specific references
```

**How to treat a reference.** Every reference sits in one of three tiers, and the tier is stated in the decision entry that cites it — check [`fliptap-decisions.md`](fliptap-decisions.md) before implementing against any image:

| Tier | Meaning | How to use it |
|---|---|---|
| **LOCKED** | The approved target for that surface. Most `webapp/*.png` mockups cited by an implemented decision are locked. | Authoritative for **composition, hierarchy, spacing, density and typography**. Do not improvise a different layout. |
| **DIRECTION** | Approved feel, not an approved layout (much of `inspiration/`, `inspo-icons/`). | Borrow the mood, the icon weight, the density. Do not copy structure. |
| **CONCEPT** | Explored and not adopted, or superseded by a later image (e.g. earlier login variants). | Read for history only. Never implement from one. |

**Two standing exceptions apply to every locked mockup**, both already decided and not re-litigated per screen:

1. **Colors always come from the locked FlipTap token palette**, never from a mockup's own hues. This is why Progress's charts are navy/orange/success/warning rather than the mockup's blue/purple.
2. **A mockup element with no real data or backing feature is never fabricated.** It is either omitted outright (Billing, Plan & usage, the "FlipTap Pro" upsell) or rendered as a focusable `aria-disabled` row with a "Soon" pill.

Where a written brief and a locked mockup conflict, **say so and ask** — do not silently pick one.

---

## 15. Public marketing surface

`apps/marketing` uses the product identity as raw material rather than extending the application shell. Its local presentation tokens repeat the locked navy, orange, canvas, surface, border, ink, muted, radius, Inter and JetBrains Mono values. This is deliberate duplication at a deployment boundary, not a third product token authority: the marketing app does not import `@fliptap/core`, because it needs no learning-domain code and must remain independently buildable.

The page alternates generous white sections with deep-navy storytelling surfaces. Orange remains a signal: the primary action, small section markers, progress marks, and selected interaction state. Product visuals use layered cards, restrained technical metadata, real FlipTap interaction names, and explicitly labelled illustrative metrics. Motion is limited to a slow hero-card settle and short interaction-card entrance; one reduced-motion media query neutralizes all animation and smooth scrolling. At phone widths, the hero is re-composed, interaction tabs become a scrollbar-hidden horizontal rail, product chrome simplifies, and the desktop/mobile workflow becomes a deliberate vertical sequence rather than a collapsed desktop grid.

**Verify visually.** Tests are not sufficient for UI work. Run the app and drive Chromium via the `playwright` devDependency (`npx playwright install chromium` once), check 1440×900 and 390×844, and exercise hover, keyboard focus and graded/revealed states — not just the resting state.

## 16. About FlipTap on web

`/about` uses the standard AppShell content frame and semantic Light/Dark palette. Its page identity precedes an editorial product introduction beside an ordered Recall / Reflect / Return panel. Six interaction descriptions form a three-column desktop grid, two columns at tablet widths and one on phones. Scheduling and active-workspace storage explanations sit in two bordered panels, stacked below `lg`. There is one orange primary action, Open your library; the backup shortcut and license link remain neutral. Shared interaction icons use neutral treatments here. No About-specific locked mockup is cited; the composition follows the existing workspace, typography, radii and spacing rules (D471).
