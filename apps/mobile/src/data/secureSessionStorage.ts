import * as SecureStore from 'expo-secure-store'

import { chunkKey, formatManifest, parseManifest, splitIntoChunks } from './chunkedValue'

// Where the Supabase session lives on this device.
//
// This implements the storage shape supabase-js asks for (getItem/setItem/
// removeItem, all async), not @itera/core's LocalSessionStore. Those are two
// different seams and conflating them would be a second session abstraction:
// core's LocalSessionStore is the *local/demo* session record, which a
// Supabase-mode app never reads at all, while this is the cloud session the
// Supabase client itself owns and refreshes.
//
// SecureStore rather than AsyncStorage, per the master plan's D4: a refresh
// token is a bearer credential and belongs in the keychain/keystore, not in
// plain application-sandbox storage. The cost is the size limit - iOS has
// historically refused keychain items above roughly 2048 bytes, and a Supabase
// session carrying two JWTs and a user object is comfortably larger - so one
// logical value is stored as a manifest plus N numbered chunks.
//
// The vendor example solves the same problem by encrypting the session and
// putting the ciphertext in AsyncStorage with only the key in SecureStore.
// Chunking was chosen instead because it keeps the token material itself out of
// sandbox storage and needs no crypto dependency.

/**
 * Read every chunk back, or nothing at all.
 *
 * A partially written or partially deleted set is treated as absent rather than
 * as a truncated session: half a JWT is not a credential, and a caller that
 * receives one would send it and get an opaque failure. Returning null instead
 * makes the app sign in again, which is the honest outcome. The incomplete set
 * is also cleaned up on the way out so it cannot accumulate.
 */
async function getItem(key: string): Promise<string | null> {
  const count = parseManifest(await SecureStore.getItemAsync(key))
  if (count === null) return null

  const parts: string[] = []
  for (let index = 0; index < count; index += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, index))
    if (part === null) {
      await removeItem(key)
      return null
    }
    parts.push(part)
  }

  return parts.join('')
}

/**
 * Write the chunks first, then the manifest, then drop whatever the previous
 * write left behind.
 *
 * Manifest last is what makes an interrupted write readable: until it lands,
 * the old manifest still describes the old chunk count. Stale-chunk cleanup
 * last is what makes a shorter value overwrite a longer one completely, rather
 * than leaving orphaned tail chunks in the keychain forever.
 */
async function setItem(key: string, value: string): Promise<void> {
  const previousCount = parseManifest(await SecureStore.getItemAsync(key)) ?? 0
  const chunks = splitIntoChunks(value)

  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(chunkKey(key, index), chunks[index])
  }

  await SecureStore.setItemAsync(key, formatManifest(chunks.length))

  for (let index = chunks.length; index < previousCount; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index))
  }
}

/**
 * Manifest first, so a failure partway through deletion can never leave a
 * manifest pointing at chunks that are already gone - which would read as a
 * valid-looking session with a hole in it. Without the manifest the remaining
 * chunks are unreachable and inert, and the next write overwrites them.
 */
async function removeItem(key: string): Promise<void> {
  const count = parseManifest(await SecureStore.getItemAsync(key)) ?? 0
  await SecureStore.deleteItemAsync(key)
  for (let index = 0; index < count; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index))
  }
}

export const secureSessionStorage = { getItem, setItem, removeItem }
