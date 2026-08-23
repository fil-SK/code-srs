// The Itera brand identity as platform-neutral values.
//
// These exist because a React Native app cannot read a CSS custom property.
// The web app's src/index.css remains the source that actually paints the
// browser - nothing here is injected into it and no CSS is generated - and a
// drift test in the web app parses that file and asserts every value below
// matches, in both directions. So there are two representations and one truth,
// enforced mechanically rather than by discipline, with no build step, no
// generated stylesheet and no watch process. See docs/design-system.md.
//
// What belongs here: semantic product identity - the locked palette, the
// radius scale, the two font families and their locked roles, and the names of
// the two shadow intents.
//
// What deliberately does NOT belong here, and must not be added:
//
//  - The type and spacing scale. docs/design-system.md states outright that it
//    is a design rule, not a token: components match it with literal utilities
//    and there is no mirrored set of CSS variables to be the counterpart of.
//  - Page widths, breakpoints, nav heights, sidebar widths, card offsets. Those
//    are layout mechanics, and the two platforms are meant to differ in layout
//    while sharing identity. A `mobileCardMargin` here would be the beginning
//    of pixel-parity, which is the trap the convergence plan exists to avoid.
//  - Shadow values. The name is shared below; the value is not, because
//    `box-shadow` and React Native's elevation/shadowOpacity are different
//    models rather than different syntaxes for one thing.

// The locked --itera-* palette. Light-only: the app declares itself light and
// has no dark palette to pair these with (docs/CURRENT_STATE.md).
export const iteraColors = {
  navy: '#1e293b',

  canvas: '#f6f7f9',
  surface: '#ffffff',
  surfaceSubtle: '#f9fafb',
  ink: '#172033',
  inkBrand: '#1e293b',
  muted: '#64748b',
  mutedLight: '#94a3b8',
  border: '#e3e7ed',
  borderStrong: '#cbd3de',

  accent: '#ff6902',
  accentHover: '#ea5f00',
  accentActive: '#d95700',
  accentSoft: '#fff2e8',
  accentSofter: '#fff8f3',

  navySoft: '#eef2f7',
  selectionSoft: '#f2f6fc',
  selectionBorder: '#9cb4db',

  success: '#15803d',
  successSoft: '#ecfdf3',
  error: '#c2413a',
  errorSoft: '#fef2f2',
  warning: '#b45309',
  warningSoft: '#fff7ed',
} as const

export type IteraColorName = keyof typeof iteraColors

// Density units, not a spacing scale: pills, controls, cards and dialogs each
// have one radius and the difference between them is meaningful ("don't round
// everything equally"). Numbers rather than 'px' strings, because React Native
// takes numbers and the web adds the unit.
export const iteraRadii = {
  control: 9,
  card: 14,
  dialog: 16,
  pill: 999,
} as const

export type IteraRadiusName = keyof typeof iteraRadii

// Two families, no more (docs/design-system.md, locked). `mono` is for code,
// keyboard shortcuts and selected technical metadata; `sans` is everything
// else, including headings and wordmarks - hierarchy comes from weight and
// scale, never from a third family.
export const iteraFonts = {
  sans: 'Inter',
  mono: 'JetBrains Mono',
} as const

// The finalized weights: headings sit at 650, body and UI copy in 400-600.
export const iteraFontWeights = {
  heading: 650,
  bodyMin: 400,
  bodyMax: 600,
} as const

// Shared as intent names only - see the module comment. A platform resolves
// `card` to its own elevation treatment; `card` is for the main Review cards
// and comparable surfaces, `float` for genuinely floating elements.
export const ITERA_SHADOW_INTENTS = ['card', 'float'] as const
export type IteraShadowIntent = (typeof ITERA_SHADOW_INTENTS)[number]
