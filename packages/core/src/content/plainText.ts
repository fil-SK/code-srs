// Flattening Itera's text syntax to plain characters, for places that cannot
// present formatting at all: screen-reader labels, and any future native
// accessibility string.
//
// Deliberately marker-blind rather than parse-derived. It removes every ` and
// * character, matched or not, which is what the matching board's announcer
// has always done and what keeps `a * b` from being announced as "a b" in one
// card and "a * b" in another depending on whether a second star happens to
// appear later in the label. A parse-derived flattening would be more
// principled and would differ on unmatched markers, so switching to one is a
// behavior change and needs its own decision, not a silent upgrade here.
//
// This is presentation, not sanitization: nothing here makes content safe, and
// no caller should treat it as a security boundary. See parseRichText.ts.
const INLINE_MARKERS = /[`*]/g

export function stripInlineMarkers(text: string): string {
  return text.replace(INLINE_MARKERS, '')
}
