import { lazy, Suspense } from 'react'
import { importWithReload } from '@/lib/lazyWithRetry'

const CodeEditor = lazy(() =>
  importWithReload(() =>
    import('./CodeEditor').then((m) => ({ default: m.CodeEditor })),
  ),
)

export function LazyCodeEditor(props: {
  value: string
  language: string
  onChange: (value: string) => void
}) {
  return (
    <Suspense
      fallback={
        <div className="rounded-[10px] border border-border bg-code-bg p-4 font-mono text-xs text-faint">
          Loading editor…
        </div>
      }
    >
      <CodeEditor {...props} />
    </Suspense>
  )
}
