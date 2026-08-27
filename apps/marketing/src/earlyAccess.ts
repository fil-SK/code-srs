export type EarlyAccessInterest = {
  email: string
  learningGoal?: string
}

export class EarlyAccessCaptureUnavailableError extends Error {
  constructor() {
    super('Early-access capture is not configured.')
    this.name = 'EarlyAccessCaptureUnavailableError'
  }
}

// This is the only persistence boundary for the marketing form. Connect a
// provider here later; the UI must continue to treat rejection as "not stored".
export function submitEarlyAccessInterest(_interest: EarlyAccessInterest): Promise<never> {
  return Promise.reject(new EarlyAccessCaptureUnavailableError())
}
