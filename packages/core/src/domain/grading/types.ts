// The result an auto-graded interaction produces, shared by every grader in
// this directory and by whatever renders the outcome.
//
// It used to be declared in src/features/reviewV2/reviewPhase.ts, which made
// domain/grading/walkthrough.ts import from features/ - a domain module
// depending on a UI module, the wrong direction, and a features/ path that
// could not follow the domain into a platform-neutral package. The contract is
// a grading concept, not a phase-machine concept, so it lives with the graders
// and the phase machine consumes it.

export interface ObjectiveResult {
  correct: boolean
  // Partial credit, 0..1, for interaction types where "correct" alone loses
  // information (Matching's per-relationship fraction, Walkthrough's
  // per-step fraction). Optional and unused by Recall/Multiple
  // Choice/Write Code, which stay binary.
  score?: number
}
