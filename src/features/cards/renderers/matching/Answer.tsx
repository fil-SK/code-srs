import { InlineText } from '@/components/text/RichText'
import type { AnswerProps } from '../../registry/types'
import { ExplanationView } from '../Explanation'

export function MatchingAnswer({ content }: AnswerProps<'matching'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Correct matches
      </div>
      <ul className="space-y-1 text-sm leading-relaxed">
        {content.pairs.map((pair) => (
          <li key={pair.id}>
            <span className="font-medium">
              <InlineText text={pair.left} />
            </span>
            <span className="text-faint"> → </span>
            <InlineText text={pair.right} />
            {content.triple && pair.third && (
              <>
                <span className="text-faint"> → </span>
                <InlineText text={pair.third} />
              </>
            )}
          </li>
        ))}
      </ul>
      <ExplanationView text={content.explanation} />
    </>
  )
}
