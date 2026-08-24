/* eslint-env jest */

// expo-secure-store is a native module with no JS implementation under Jest.
// The adapter's whole job is sequencing calls to it, so the double is an
// in-memory keychain: it records exactly what was written under which key,
// which is what the chunking tests need to assert against.
jest.mock('expo-secure-store', () => {
  const store = new Map()
  return {
    __store: store,
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value)
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key)
    }),
  }
})

beforeEach(() => {
  const secureStore = require('expo-secure-store')
  secureStore.__store.clear()
  jest.clearAllMocks()
})
