import type { AnswerProps } from '../../registry/types'

export function MatchingAnswer({ content }: AnswerProps<'matching'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Correct matches
      </div>
      <ul className="space-y-1 text-sm leading-relaxed">
        {content.pairs.map((pair) => (
          <li key={pair.id}>
            <span className="font-medium">{pair.left}</span>
            <span className="text-faint"> → </span>
            {pair.right}
          </li>
        ))}
      </ul>
    </>
  )
}
