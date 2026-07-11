import { useEffect, useRef } from 'react'
import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  lineNumbers,
} from '@codemirror/view'
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { useTheme } from '@/app/theme'
import { languageExtension } from './languageExtensions'

const MONO = "'JetBrains Mono','Cascadia Code','Fira Code',ui-monospace,monospace"

// Transparent so the wrapping container's --code-bg shows through, keeping the
// editor visually consistent with the rest of the app in both themes.
const baseTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', fontSize: '13px' },
  '.cm-content': { fontFamily: MONO, padding: '12px 0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--faint)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 14px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
  '&.cm-focused': { outline: 'none' },
  // Emphasized lines (a story step's "focus here" range).
  '.cm-hl-line': {
    backgroundColor: 'var(--accent-soft)',
    boxShadow: 'inset 3px 0 0 0 var(--accent)',
  },
})

// A read-only StateField that tints the given 1-based lines. Static because the
// document never changes in this view.
function lineHighlighter(lines: number[]) {
  const mark = Decoration.line({ attributes: { class: 'cm-hl-line' } })
  return StateField.define<DecorationSet>({
    create(state) {
      const builder = new RangeSetBuilder<Decoration>()
      for (const n of lines) {
        if (n >= 1 && n <= state.doc.lines) {
          builder.add(state.doc.line(n).from, state.doc.line(n).from, mark)
        }
      }
      return builder.finish()
    },
    update: (value) => value,
    provide: (f) => EditorView.decorations.from(f),
  })
}

// Read-only, syntax-highlighted code display built on CodeMirror 6.
export function CodeView({
  code,
  language,
  highlightLines,
}: {
  code: string
  language: string
  highlightLines?: number[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  // Serialize the lines so the editor only rebuilds when the set actually
  // changes, not on every parent render (the array identity differs each time).
  const hlKey = (highlightLines ?? []).join(',')

  useEffect(() => {
    const parent = ref.current
    if (!parent) return

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
          baseTheme,
          syntaxHighlighting(
            theme === 'dark' ? oneDarkHighlightStyle : defaultHighlightStyle,
          ),
          ...(highlightLines?.length ? [lineHighlighter(highlightLines)] : []),
          ...languageExtension(language),
        ],
      }),
    })

    return () => view.destroy()
    // hlKey stands in for highlightLines (a fresh array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, theme, hlKey])

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[10px] border border-border bg-code-bg"
    />
  )
}
