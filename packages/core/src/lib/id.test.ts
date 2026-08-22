import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId } from './id'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('newId', () => {
  it('uses the native generator when it exists', () => {
    const randomUUID = vi.fn(() => '11111111-2222-4333-8444-555555555555')
    vi.stubGlobal('crypto', { randomUUID, getRandomValues: () => new Uint8Array(16) })

    expect(newId()).toBe('11111111-2222-4333-8444-555555555555')
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })

  // The insecure-context case: crypto exists but randomUUID (secure contexts
  // only) does not, which is what a plain-HTTP LAN dev origin looks like.
  it('falls back to getRandomValues when randomUUID is missing', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        array.fill(0xff)
        return array
      },
    })

    const id = newId()
    expect(id).toMatch(V4)
    // Version and variant nibbles are forced even when every random byte is 0xff.
    expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
  })

  it('produces the same format on both branches', () => {
    const native = newId()
    expect(native).toMatch(V4)

    const real = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { getRandomValues: real })
    expect(newId()).toMatch(V4)
  })

  it('does not collide across many fallback ids', () => {
    const real = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { getRandomValues: real })

    const ids = new Set(Array.from({ length: 2_000 }, () => newId()))
    expect(ids.size).toBe(2_000)
  })
})
