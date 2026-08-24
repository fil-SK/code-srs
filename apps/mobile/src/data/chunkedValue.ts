// Splitting one string into SecureStore-sized pieces, as pure functions.
//
// Separated from the storage adapter so the size arithmetic can be tested
// without a native module, and so the adapter itself stays a thin sequence of
// SecureStore calls. Nothing here touches Expo or React Native.

/**
 * Bytes per chunk. iOS keychain items have historically been refused above
 * roughly 2048 bytes, so this stays comfortably below that rather than at it.
 * Not a product setting: raising or lowering it only changes how many keys one
 * session occupies, and the adapter is correct for any value.
 */
export const MAX_CHUNK_BYTES = 1800

/**
 * How many UTF-8 bytes one Unicode code point occupies.
 *
 * Computed rather than measured with TextEncoder: core's platform-neutrality
 * rules keep this workspace honest about which globals it assumes, and a
 * ten-line table is cheaper than depending on a global whose presence varies
 * across Hermes releases.
 */
export function utf8ByteLength(codePoint: number): number {
  if (codePoint < 0x80) return 1
  if (codePoint < 0x800) return 2
  if (codePoint < 0x10000) return 3
  return 4
}

/**
 * Split by code point, never by UTF-16 code unit, so an emoji or any other
 * astral character can never be cut in half across two chunks and come back as
 * two replacement characters. `Array.from` iterates code points.
 *
 * An empty input is one empty chunk rather than zero chunks, so "stored an
 * empty string" and "stored nothing" stay distinguishable through the manifest.
 */
export function splitIntoChunks(value: string, maxBytes = MAX_CHUNK_BYTES): string[] {
  if (value === '') return ['']

  const chunks: string[] = []
  let current = ''
  let currentBytes = 0

  for (const character of Array.from(value)) {
    const size = utf8ByteLength(character.codePointAt(0) ?? 0)
    if (currentBytes + size > maxBytes && current !== '') {
      chunks.push(current)
      current = ''
      currentBytes = 0
    }
    current += character
    currentBytes += size
  }

  chunks.push(current)
  return chunks
}

// The manifest stored under the caller's own key. It is deliberately not bare
// JSON and not a bare number: a value written by some earlier, unchunked
// implementation (or by anything else that owned this key) must read as
// "unrecognized" rather than being mistaken for a chunk count.
const MANIFEST_PREFIX = 'itera.chunked.v1:'

export function formatManifest(chunkCount: number): string {
  return `${MANIFEST_PREFIX}${chunkCount}`
}

/** `null` for anything this adapter did not write, including a corrupt value. */
export function parseManifest(raw: string | null): number | null {
  if (raw === null || !raw.startsWith(MANIFEST_PREFIX)) return null
  const count = Number(raw.slice(MANIFEST_PREFIX.length))
  if (!Number.isInteger(count) || count < 1) return null
  return count
}

export function chunkKey(key: string, index: number): string {
  return `${key}.${index}`
}
