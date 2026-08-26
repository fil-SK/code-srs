import * as ExpoCrypto from 'expo-crypto'

interface CryptoLike {
  randomUUID?: () => string
  getRandomValues?: (array: Uint8Array) => Uint8Array
}

interface CryptoProvider extends CryptoLike {
  getRandomValues: (array: Uint8Array) => Uint8Array
}

interface CryptoTarget {
  crypto?: CryptoLike
}

// Core deliberately depends on the Web Crypto shape instead of a platform
// package. Expo Go does not install that shape globally, so the mobile
// composition boundary supplies the two operations core's newId() uses.
export function installMobileCrypto(
  target: CryptoTarget = globalThis as unknown as CryptoTarget,
  provider: CryptoProvider = ExpoCrypto,
): void {
  const current = target.crypto

  if (!current) {
    target.crypto = {
      randomUUID: provider.randomUUID,
      getRandomValues: provider.getRandomValues,
    }
    return
  }

  // A browser on an insecure origin can have getRandomValues without
  // randomUUID. Core already handles that case with its UUID v4 fallback.
  if (typeof current.getRandomValues === 'function') return

  current.getRandomValues = provider.getRandomValues
}
