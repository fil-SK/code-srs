// Deterministic 1-3 char deck-mark label from a deck's name (no separate
// field exists or is needed): initials of the first two words, or the first
// `maxLen` characters of a single-word name. `maxLen` defaults to 2 (the
// small row mark); the large deck-header mark passes 3 so short, already-an-
// acronym names ("C++", "SQL", "STL") show in full rather than being clipped
// to 2 characters.
//
// Words that do not start with a letter or digit are skipped when picking
// initials. Naming a deck "Algorithms & Problem Solving" is completely
// ordinary, and taking the first two words literally produced "A&" - which
// reads as a rendering bug rather than a monogram, and appeared on Today,
// Library and Progress at once. The ampersand is a separator, not a word.
function isWordStart(ch: string): boolean {
  return /[\p{L}\p{N}]/u.test(ch)
}

export function markLabelFor(name: string, maxLen = 2): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && isWordStart(w[0]))

  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  if (words.length === 1) return words[0].slice(0, maxLen).toUpperCase()
  // Nothing alphanumeric to work with (an emoji-only or punctuation-only
  // name): fall back to the raw characters rather than inventing one.
  return name.trim().slice(0, maxLen).toUpperCase() || '?'
}
