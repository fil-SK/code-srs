// Deterministic 1-3 char deck-mark label from a deck's name (no separate
// field exists or is needed): initials of the first two words, or the first
// two characters of a single-word name.
export function markLabelFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.trim().slice(0, 2).toUpperCase() || '?'
}
