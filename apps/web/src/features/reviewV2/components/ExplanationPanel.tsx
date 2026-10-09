import { StudyGuidancePanel } from './StudyGuidancePanel'

// Post-answer context stays before ratings; custom titles distinguish step scope.
export function ExplanationPanel({
  text,
  title = 'Explanation',
}: {
  text: string | undefined
  title?: string
}) {
  return <StudyGuidancePanel text={text} title={title} kind="explanation" />
}
