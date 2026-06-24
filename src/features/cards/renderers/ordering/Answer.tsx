import type { AnswerProps } from '../../registry/types'

export function OrderingAnswer({ content }: AnswerProps<'ordering'>) {
  return (
    <>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Correct order
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
        {content.items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ol>
    </>
  )
}
