// Languages a deck's cards can be in. Stored as a short code on the deck
// (`deck.language`); future per-card languages or language-specific behavior can
// build on the same codes. Extend this list as needed.
export const DECK_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sr', label: 'Serbian' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'ru', label: 'Russian' },
  { code: 'hr', label: 'Croatian' },
] as const

export type DeckLanguageCode = (typeof DECK_LANGUAGES)[number]['code']

// Human label for a stored code; falls back to the code itself if unknown.
export function languageLabel(code: string | undefined): string | undefined {
  if (!code) return undefined
  return DECK_LANGUAGES.find((l) => l.code === code)?.label ?? code
}
