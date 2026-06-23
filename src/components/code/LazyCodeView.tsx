import { lazy, Suspense } from 'react'

// CodeMirror + language grammars are heavy, so load them on demand: this keeps
// them out of the initial bundle and in a chunk fetched the first time a code
// card is shown.
const CodeView = lazy(() =>
  import('./CodeView').then((m) => ({ default: m.CodeView })),
)

export function LazyCodeView(props: { code: string; language: string }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-[10px] border border-border bg-code-bg p-4 font-mono text-xs text-faint">
          Loading code…
        </div>
      }
    >
      <CodeView {...props} />
    </Suspense>
  )
}
