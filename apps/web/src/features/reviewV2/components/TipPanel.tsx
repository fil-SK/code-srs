import { StudyGuidancePanel } from './StudyGuidancePanel'

// Guidance stays below its card or step and disappears when the answer is shown.
// Keep custom titles for step-scoped guidance.
export function TipPanel({
  text,
  title = 'Hint',
}: {
  text: string | undefined
  title?: string
}) {
  return <StudyGuidancePanel text={text} title={title} kind="hint" />
}
