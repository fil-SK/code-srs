import { newId } from '@itera/core'

import { installMobileCrypto } from './mobileCrypto'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('installMobileCrypto', () => {
  const provider = {
    randomUUID: () => '11111111-2222-4333-8444-555555555555',
    getRandomValues: (array: Uint8Array) => {
      array.fill(7)
      return array
    },
  }

  it('lets shared id generation run when Expo Go provides no global crypto', () => {
    const target = {} as NonNullable<Parameters<typeof installMobileCrypto>[0]>

    installMobileCrypto(target, provider)

    expect(target.crypto).toBeDefined()
    expect(target.crypto?.randomUUID?.()).toBe('11111111-2222-4333-8444-555555555555')
    expect(target.crypto?.getRandomValues?.(new Uint8Array(16))).toHaveLength(16)
  })

  it('preserves a platform crypto implementation that already supports random values', () => {
    const getRandomValues = <T extends ArrayBufferView>(array: T) => array
    const crypto = { getRandomValues }
    const target = { crypto }

    installMobileCrypto(target, provider)

    expect(target.crypto).toBe(crypto)
    expect(target.crypto.getRandomValues).toBe(getRandomValues)
  })

  it('matches the crypto contract consumed by core newId', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')

    try {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: undefined,
        writable: true,
      })
      installMobileCrypto(undefined, provider)

      expect(newId()).toMatch(V4)
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original)
      else delete (globalThis as { crypto?: unknown }).crypto
    }
  })
})
