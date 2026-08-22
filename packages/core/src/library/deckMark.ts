// Deterministic 1-3 char deck-mark label from a deck's name (no separate
// field exists or is needed): initials of the first two words, or the first
// `maxLen` characters of a single-word name. `maxLen` defaults to 2 (the
// small row mark); the large deck-header mark passes 3 so short, already-an-
// acronym names ("C++", "SQL", "STL") show in full rather than being clipped
// to 2 characters.
export function markLabelFor(name: string, maxLen = 2): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.trim().slice(0, maxLen).toUpperCase() || '?'
}
