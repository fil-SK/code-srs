// Stable unique id generator for entities. crypto.randomUUID is available in all
// modern browsers and Node 19+ (used by tests).
export function newId(): string {
  return crypto.randomUUID()
}
