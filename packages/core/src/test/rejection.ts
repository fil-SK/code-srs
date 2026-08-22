// Await the error a promise rejects with, typed.
//
// `promise.catch((e) => e as SomeError)` looks equivalent and is not: its result
// is `void | SomeError`, so every assertion on the error needs a cast, and a
// promise that wrongly *resolves* sails through the catch and fails later on a
// confusing property access. This throws at the point the expectation broke.
export async function rejection<E>(promise: Promise<unknown>): Promise<E> {
  return promise.then(
    () => {
      throw new Error('expected the promise to reject, but it resolved')
    },
    (error: unknown) => error as E,
  )
}
