// Stable unique id generator for entities: one RFC 4122 v4 UUID convention,
// whatever the origin.
//
// crypto.randomUUID is restricted to secure contexts, so a plain-HTTP LAN dev
// origin (http://192.168.x.x:5173, the physical-phone testing path) has crypto
// but no randomUUID, and calling it there threw. That throw was not local: the
// router eagerly imports the design-preview pages, whose fixtures call newId()
// at module scope, so the failure landed during router evaluation and blanked
// every ordinary route too.
//
// crypto.getRandomValues carries no secure-context restriction, so the fallback
// builds the same v4 shape from the same CSPRNG: same format, same entropy, no
// dependency, and no environment-specific id.
// Core compiles with no DOM and no Node ambient types, so neither the `crypto`
// global nor its `Crypto` type exists here. The smallest structural description
// of what this function actually uses is enough, and it is also the honest one:
// the algorithm depends on those two members and on nothing else a platform
// provides. Native supplies react-native-get-random-values at its own entry
// point; core imports no polyfill and branches on no platform.
interface CryptoLike {
  randomUUID?: () => string
  getRandomValues<T extends ArrayBufferView>(array: T): T
}

// Read at call time, not at module scope: a module-scope capture would freeze
// whatever global existed at import, which breaks both a late polyfill and the
// tests' vi.stubGlobal('crypto', ...).
function platformCrypto(): CryptoLike {
  return (globalThis as unknown as { crypto: CryptoLike }).crypto
}

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))

export function newId(): string {
  const crypto = platformCrypto()
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40 // version 4
  b[8] = (b[8] & 0x3f) | 0x80 // variant 10xx

  return (
    HEX[b[0]] + HEX[b[1]] + HEX[b[2]] + HEX[b[3]] +
    '-' + HEX[b[4]] + HEX[b[5]] +
    '-' + HEX[b[6]] + HEX[b[7]] +
    '-' + HEX[b[8]] + HEX[b[9]] +
    '-' + HEX[b[10]] + HEX[b[11]] + HEX[b[12]] + HEX[b[13]] + HEX[b[14]] + HEX[b[15]]
  )
}
