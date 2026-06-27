// Response key for a pair's third-column choice. The right-column choice keeps
// using the bare pair id, so 2-part matching cards (and their saved responses)
// are unaffected by adding 3-part support.
export const thirdKey = (pairId: string) => `${pairId}#3`
