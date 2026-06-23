import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { LazyCodeView } from '@/components/code/LazyCodeView'
import type { QuestionProps } from '../../registry/types'

export function BugFindingQuestion({ content }: QuestionProps<'bugFinding'>) {
  const [showHint, setShowHint] = useState(false)

  return (
    <div className="space-y-4">
      <div className="text-[15px] font-semibold leading-snug">
        {content.question?.trim() || 'Find the bug'}
      </div>
      <LazyCodeView code={content.code.code} language={content.code.language} />

      {content.bugHint?.trim() &&
        (showHint ? (
          <div className="rounded-[9px] border border-border bg-panel-2 p-3 text-sm text-muted">
            <span className="font-semibold text-amber">Hint: </span>
            {content.bugHint}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowHint(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber hover:underline"
          >
            <Lightbulb size={14} /> Show hint
          </button>
        ))}
    </div>
  )
}
