// Deterministic timezone for the date-sensitive tests.
//
// The local-calendar-day rules Itera depends on (streaks, activity, ranges)
// only misbehave in a DST-observing zone, so those tests must not run under
// whatever zone the developer's machine or CI happens to be set to. Node reads
// `process.env.TZ` on assignment and re-resolves the zone for every Date built
// afterwards, which is all this needs - no timezone package is involved.
//
// Call `pinTimeZone` at module scope, before the file builds any Date, and
// register the returned restore function with `afterAll` so the change cannot
// leak into another test file sharing the worker process.

export const DST_TEST_TIME_ZONE = 'Europe/Belgrade'

/** Sets the process timezone. Returns the restore function for `afterAll`. */
export function pinTimeZone(timeZone: string): () => void {
  const previous = process.env.TZ
  process.env.TZ = timeZone
  return () => {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
}

/**
 * Offsets of the pinned zone at two unambiguous instants: CET (UTC+1) in
 * January, CEST (UTC+2) in July. `getTimezoneOffset` reports minutes *behind*
 * UTC, hence the negative values. A file asserts this first so that a pin which
 * silently failed to apply fails the suite instead of quietly testing whatever
 * zone the machine uses.
 */
export function timeZoneOffsetsAreCetCest(): boolean {
  return (
    new Date(2026, 0, 15, 12).getTimezoneOffset() === -60 &&
    new Date(2026, 6, 15, 12).getTimezoneOffset() === -120
  )
}
