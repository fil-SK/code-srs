import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { useTheme } from '@/app/theme'
import { languageExtension } from './languageExtensions'

const MONO = "'JetBrains Mono','Cascadia Code','Fira Code',ui-monospace,monospace"

const baseTheme = EditorView.theme({
  '&': { backgroundColor: 'transparent', fontSize: '13px' },
  '.cm-content': { fontFamily: MONO, padding: '12px 0', minHeight: '96px' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--faint)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 14px' },
  '&.cm-focused': { outline: 'none' },
})

// Editable CodeMirror. `value` is the initial document only — the editor is
// uncontrolled after mount (recreating per keystroke would lose the cursor), so
// callers remount it (via key) when they need a fresh document. Recreated on
// language/theme change. Changes are pushed up via onChange.
export function CodeEditor({
  value,
  language,
  onChange,
}: {
  value: string
  language: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const { theme } = useTheme()

  useEffect(() => {
    const parent = ref.current
    if (!parent) return

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.lineWrapping,
          baseTheme,
          syntaxHighlighting(
            theme === 'dark' ? oneDarkHighlightStyle : defaultHighlightStyle,
          ),
          ...languageExtension(language),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString())
          }),
        ],
      }),
    })

    return () => view.destroy()
    // value is intentionally the initial doc only; see component note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, theme])

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[10px] border border-border bg-code-bg focus-within:border-accent"
    />
  )
}
