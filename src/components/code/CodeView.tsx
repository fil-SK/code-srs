import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
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
})

// Read-only, syntax-highlighted code display built on CodeMirror 6.
export function CodeView({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

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
          ...languageExtension(language),
        ],
      }),
    })

    return () => view.destroy()
  }, [code, language, theme])

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[10px] border border-border bg-code-bg"
    />
  )
}
