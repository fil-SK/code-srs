const LONG_PROMPT_CHARACTERS = 280
const LONG_PROMPT_LINES = 6

export function isLongCardPrompt(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  const characters = trimmed.replace(/\s+/g, ' ').length
  const nonEmptyLines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0).length
  return characters > LONG_PROMPT_CHARACTERS || nonEmptyLines > LONG_PROMPT_LINES
}
