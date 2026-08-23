// The source-format policy for the one image a card can carry
// (WalkthroughInteraction.image).
//
// That field is untrusted persisted content: it survives a backup round trip,
// and a backup file is user-supplied JSON that may have been written by
// somebody other than the learner opening it. It is also the only card field
// that reaches a browser URL sink - every other field is prose that renders as
// text.
//
// An `<img src>` is not a script-execution sink (a `javascript:` URL is inert
// there, and an SVG loaded through <img> runs in a mode where scripts and
// external references do not execute), so this is not classic XSS. It is a
// privacy defect: an arbitrary remote URL turns opening a flashcard into a
// network callback to a host the learner never chose, leaking their IP and
// user agent and confirming they opened that card - in an app whose whole
// premise is that a local workspace works offline.
//
// The rule is an allowlist of exactly the forms Itera's own authoring flow can
// produce: FileReader.readAsDataURL over a raster image file. Nothing else is
// accepted, so there is no scheme to reason about at the call sites.
//
// SVG is excluded on purpose. It is markup with an XML parser and an external-
// reference model attached, which is substantially more active content than a
// raster format, and the product has no requirement for it. The authoring UI
// is narrowed to this same list so authoring can never mint a value that
// validation would refuse.
//
// The predicate inspects only the URL's shape. The encoded bytes are never
// decoded, re-encoded or otherwise rewritten - a card's image is preserved
// exactly as authored, the same way its text is.

export const ALLOWED_IMAGE_MIME = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
] as const

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number]

// Anchored, whitespace-free, and base64 only.
//
// Whitespace matters more than it looks: a browser strips ASCII whitespace out
// of a URL attribute before parsing it, so a value like `data:image/sv g+xml`
// or one with a newline inside the media type would become a different, longer
// media type after parsing than the one a lenient check saw. Refusing every
// character outside the base64 alphabet removes that entire class of
// discrepancy rather than trying to normalize it.
//
// Case-insensitive is safe here because this is an allowlist: a value must
// still begin with `data:image/` and name one of the five types, so no amount
// of case play reaches another scheme.
const ALLOWED_IMAGE_SOURCE = new RegExp(
  `^data:(?:${ALLOWED_IMAGE_MIME.join('|').replace(/\//g, '\\/')});base64,[A-Za-z0-9+/]+={0,2}$`,
  'i',
)

/**
 * True only for an image source this product is willing to load: a base64
 * `data:` URL naming one of the allowed raster media types.
 *
 * Everything else is false, including `https:` and `http:` URLs,
 * protocol-relative `//host/path`, `blob:`, `file:`, `javascript:`,
 * `vbscript:`, `data:text/html`, any other `data:image/...` type, and any
 * value carrying whitespace.
 */
export function isSafeImageSource(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_IMAGE_SOURCE.test(value)
}

/**
 * True when a picked or pasted file's media type is one the card model accepts.
 * Kept next to the predicate above so the authoring filter and the persisted-
 * value rule can never drift apart.
 */
export function isAllowedImageFileType(mime: string): boolean {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime.toLowerCase())
}

/**
 * The `accept` attribute for an image picker, derived from the same list.
 */
export const IMAGE_FILE_ACCEPT = ALLOWED_IMAGE_MIME.join(',')
