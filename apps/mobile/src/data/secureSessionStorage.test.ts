import * as SecureStore from 'expo-secure-store'

import { MAX_CHUNK_BYTES, parseManifest, splitIntoChunks, utf8ByteLength } from './chunkedValue'
import { secureSessionStorage } from './secureSessionStorage'

const KEY = 'sb-projectref-auth-token'

// The mocked keychain from jest.setup.js, so a test can inspect what actually
// landed rather than only what reads back.
const keychain = (SecureStore as unknown as { __store: Map<string, string> }).__store

function storedKeys(): string[] {
  return [...keychain.keys()].sort()
}

describe('chunk arithmetic', () => {
  it('measures UTF-8 width per code point', () => {
    expect(utf8ByteLength('a'.codePointAt(0)!)).toBe(1)
    expect(utf8ByteLength('ä'.codePointAt(0)!)).toBe(2)
    expect(utf8ByteLength('☃'.codePointAt(0)!)).toBe(3)
    expect(utf8ByteLength('😀'.codePointAt(0)!)).toBe(4)
  })

  it('keeps every chunk within the byte budget', () => {
    const chunks = splitIntoChunks('😀'.repeat(2000))
    for (const chunk of chunks) {
      const bytes = Array.from(chunk).reduce((n, c) => n + utf8ByteLength(c.codePointAt(0)!), 0)
      expect(bytes).toBeLessThanOrEqual(MAX_CHUNK_BYTES)
    }
  })

  it('never splits an astral character across chunks', () => {
    // Each emoji is one code point but two UTF-16 code units. A naive
    // slice-by-length would cut one in half and produce replacement characters.
    const value = '😀'.repeat(2000)
    expect(splitIntoChunks(value).join('')).toBe(value)
    expect(splitIntoChunks(value).join('')).not.toContain('�')
  })

  it('treats an empty string as one empty chunk, not as nothing', () => {
    expect(splitIntoChunks('')).toEqual([''])
  })

  it('refuses to read a manifest it did not write', () => {
    expect(parseManifest(null)).toBeNull()
    expect(parseManifest('')).toBeNull()
    expect(parseManifest('3')).toBeNull()
    expect(parseManifest('{"n":3}')).toBeNull()
    expect(parseManifest('itera.chunked.v1:0')).toBeNull()
    expect(parseManifest('itera.chunked.v1:abc')).toBeNull()
    expect(parseManifest('itera.chunked.v1:2')).toBe(2)
  })
})

describe('secureSessionStorage', () => {
  it('returns null for a key that was never written', async () => {
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBeNull()
  })

  it('round-trips a small value in a single chunk', async () => {
    await secureSessionStorage.setItem(KEY, 'small')
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBe('small')
    expect(storedKeys()).toEqual([KEY, `${KEY}.0`])
  })

  it('round-trips a value that is exactly one chunk wide', async () => {
    const exact = 'a'.repeat(MAX_CHUNK_BYTES)
    await secureSessionStorage.setItem(KEY, exact)
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBe(exact)
    expect(storedKeys()).toEqual([KEY, `${KEY}.0`])
  })

  it('spills to a second chunk one byte past the boundary', async () => {
    const overflow = 'a'.repeat(MAX_CHUNK_BYTES + 1)
    await secureSessionStorage.setItem(KEY, overflow)
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBe(overflow)
    expect(storedKeys()).toEqual([KEY, `${KEY}.0`, `${KEY}.1`])
  })

  it('round-trips a realistic multi-chunk session', async () => {
    // Roughly the shape of a real Supabase session: two JWTs plus a user object,
    // comfortably past the ~2048-byte keychain ceiling this adapter exists for.
    const session = JSON.stringify({
      access_token: 'header.' + 'p'.repeat(1400) + '.signature',
      refresh_token: 'r'.repeat(600),
      user: { id: '0d6f1f22-6a0e-4b57-9f0e-8b8b1a2c3d4e', email: 'learner@example.com' },
    })
    await secureSessionStorage.setItem(KEY, session)
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBe(session)
    expect(parseManifest(keychain.get(KEY) ?? null)).toBeGreaterThan(1)
  })

  it('cleans up stale chunks when a shorter value overwrites a longer one', async () => {
    await secureSessionStorage.setItem(KEY, 'a'.repeat(MAX_CHUNK_BYTES * 3))
    expect(storedKeys()).toHaveLength(4)

    await secureSessionStorage.setItem(KEY, 'tiny')

    // The orphaned tail chunks are gone, not merely unreferenced.
    expect(storedKeys()).toEqual([KEY, `${KEY}.0`])
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBe('tiny')
  })

  it('grows correctly when a longer value overwrites a shorter one', async () => {
    await secureSessionStorage.setItem(KEY, 'tiny')
    const longer = 'b'.repeat(MAX_CHUNK_BYTES * 2)
    await secureSessionStorage.setItem(KEY, longer)
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBe(longer)
  })

  it('removes every chunk and the manifest on clear', async () => {
    await secureSessionStorage.setItem(KEY, 'c'.repeat(MAX_CHUNK_BYTES * 3))
    await secureSessionStorage.removeItem(KEY)
    expect(storedKeys()).toEqual([])
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBeNull()
  })

  it('reads an incomplete chunk set as signed out rather than as a truncated session', async () => {
    await secureSessionStorage.setItem(KEY, 'd'.repeat(MAX_CHUNK_BYTES * 3))
    // Simulate a keychain that lost one item: half a JWT is not a credential.
    keychain.delete(`${KEY}.1`)

    await expect(secureSessionStorage.getItem(KEY)).resolves.toBeNull()
    // and the wreckage is cleaned up rather than left to accumulate.
    expect(storedKeys()).toEqual([])
  })

  it('ignores a value written under this key by anything else', async () => {
    keychain.set(KEY, '{"access_token":"from-an-older-implementation"}')
    await expect(secureSessionStorage.getItem(KEY)).resolves.toBeNull()
  })

  it('keeps two different keys independent', async () => {
    await secureSessionStorage.setItem(KEY, 'one')
    await secureSessionStorage.setItem(`${KEY}-code-verifier`, 'two')

    await secureSessionStorage.removeItem(KEY)

    await expect(secureSessionStorage.getItem(`${KEY}-code-verifier`)).resolves.toBe('two')
  })

  it('writes the manifest after its chunks', async () => {
    const order: string[] = []
    const setItemAsync = SecureStore.setItemAsync as jest.Mock
    setItemAsync.mockImplementation(async (key: string, value: string) => {
      order.push(key)
      keychain.set(key, value)
    })

    await secureSessionStorage.setItem(KEY, 'e'.repeat(MAX_CHUNK_BYTES + 1))

    // Manifest last: until it lands, the previous manifest still describes a
    // consistent set, so an interrupted write is never half-readable.
    expect(order).toEqual([`${KEY}.0`, `${KEY}.1`, KEY])
  })
})
